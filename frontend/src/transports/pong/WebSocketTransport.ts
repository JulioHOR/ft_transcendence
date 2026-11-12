import { io, type Socket } from "socket.io-client";
import type {
  GameSnapshot,
  MatchState,
  PaddleInput,
  PlayerIds,
  Side,
  Transport,
} from "../../games/pong/protocol";
import {
  EMPTY_SNAPSHOT,
  createInitialMatchState,
} from "../../games/pong/protocol";

/**
 * Defines the server state for the game.
 */
type ServerStatus = {
  /** Current server state. */
  state: string;
  /** Player's side (left or right). */
  side?: Side;
  /** Time when the countdown starts. */
  startsAt?: number;
  /** Indicates whether the player accepted the rematch. */
  accepted?: { left: boolean; right: boolean };
  /** IDs of both players. */
  players?: PlayerIds;
};

/**
 * Creates the game countdown state based on the server status and the player's current side.
 * @param status - Current server state.
 * @param currentSide - Player's current side (left or right).
 */
function countdownState(
  status: ServerStatus,
  currentSide: Side | null,
  currentPlayerIds: PlayerIds,
): Partial<MatchState> {
  return {
    phase: "countdown",
    playerSide: status.side ?? currentSide,
    playerIds: status.players ?? currentPlayerIds,
    startsAt: status.startsAt ?? null,
    rematchAccepted: { left: false, right: false },
    snapshot: EMPTY_SNAPSHOT,
    errorMessage: null,
  };
}

/**
 * Pong Socket.IO transport.
 * Connects to the server, synchronizes the match state, and sends player input.
 */
export class WebSocketTransport implements Transport {
  private readonly invitationId: string | null;

  constructor(invitationId: string | null = null) {
    this.invitationId = invitationId;
  }

  private socket: Socket | null = null;
  private onStateChange: ((state: MatchState) => void) | null = null;
  private state: MatchState = createInitialMatchState();

  /** Applies a partial patch to the local state and notifies the listener. */
  private setState(patch: Partial<MatchState>): void {
    this.state = { ...this.state, ...patch };
    this.onStateChange?.(this.state);
  }

  /** Updates the state with a snapshot received from the server. */
  private onSnapshot(snapshot: GameSnapshot): void {
    if (this.state.phase !== "playing" && this.state.phase !== "finished")
      return;
    this.setState({
      snapshot,
      phase: snapshot.winner !== null ? "finished" : "playing",
    });
  }

  /** Interprets server status events and updates the match phase. */
  private onStatus(status: ServerStatus): void {
    const playerSide = status.side ?? this.state.playerSide;
    switch (status.state) {
      case "countdown":
        this.setState(countdownState(status, playerSide, this.state.playerIds));
        break;
      case "playing":
      case "finished":
        this.setState({
          phase: status.state,
          playerSide,
          playerIds: status.players ?? this.state.playerIds,
        });
        break;
      case "resume_pending":
      case "rematch_pending":
        this.onAcceptanceStatus(status, playerSide);
        break;
      case "opponent_left":
      case "opponent_disconnected":
        this.setState({ phase: status.state });
        break;
    }
  }

  /** Updates the return-to-match status after someone leaves. */
  private onAcceptanceStatus(
    status: ServerStatus,
    playerSide: Side | null,
  ): void {
    if (status.state === "resume_pending") {
      this.setState({
        phase: "resume_pending",
        playerSide,
        resumeAccepted: status.accepted ?? { left: false, right: false },
      });
      return;
    }
    this.setState({
      phase: "finished",
      rematchAccepted: status.accepted ?? { left: false, right: false },
    });
  }

  /** Marks the match as errored unless it has already finished. */
  private onError(message?: string): void {
    if (
      this.state.phase === "finished" ||
      this.state.snapshot.winner !== null
    ) {
      return;
    }
    this.setState({
      phase: "error",
      errorMessage: message ?? "Tente novamente.",
    });
  }

  /** Waits for the socket to connect or rejects on connection failure. */
  private waitUntilConnected(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket?.once("connect", () => resolve());
      this.socket?.once("connect_error", (error) => reject(error));
    });
  }

  /** Joins the matchmaking queue and returns the server acknowledgment. */
  private joinQueue(): Promise<{ status: string }> {
    const socket = this.socket;
    if (socket == null) {
      this.onError("Não foi possível conectar à partida. Tente novamente.");
      return Promise.resolve({ status: "error" });
    }
    return new Promise((resolve) => {
      socket.emit(
        "queue:join",
        this.invitationId == null ? {} : { inviteId: this.invitationId },
        (ack: { status: string } | null) => {
          if (ack == null && this.state.phase !== "error") {
            this.onError(
              "Não foi possível entrar na partida. Tente novamente.",
            );
          }
          resolve(ack ?? { status: "error" });
        },
      );
    });
  }

  /** Rejoins the queue after a Socket.IO reconnection. */
  private async rejoinAfterReconnect(): Promise<void> {
    const ack = await this.joinQueue();
    if (ack.status === "waiting") this.setState({ phase: "waiting" });
  }

  /** Registers the game connection events. */
  private bindSocketEvents(socket: Socket): void {
    socket.on("game:snapshot", (snapshot) => this.onSnapshot(snapshot));
    socket.on("game:status", (status) => this.onStatus(status));
    socket.on("game:error", (error: { message?: string }) =>
      this.onError(error.message),
    );
    socket.on("disconnect", () => {
      if (this.state.phase === "playing")
        this.setState({ phase: "connecting" });
    });

    let initialConnection = true;
    socket.on("connect", () => {
      if (initialConnection) {
        initialConnection = false;
        return;
      }
      void this.rejoinAfterReconnect();
    });
  }

  /** Connects to the Socket.IO server and joins the match queue. */
  async connect(): Promise<void> {
    this.state = createInitialMatchState();
    this.setState({ phase: "connecting" });
    this.socket = io({ transports: ["websocket"] });
    this.bindSocketEvents(this.socket);
    await this.waitUntilConnected();
    const ack = await this.joinQueue();
    if (ack.status === "waiting") this.setState({ phase: "waiting" });
  }

  /** Closes the Socket.IO connection and clears the state listener. */
  disconnect(): void {
    if (this.state.phase === "waiting") {
      this.socket?.emit("queue:leave");
    }
    this.socket?.disconnect();
    this.socket = null;
    this.onStateChange = null;
  }

  /** Requests a rematch from the server. */
  requestRematch(): void {
    this.socket?.emit("game:rematch");
  }

  /** Accepts resuming the paused match. */
  requestResume(): void {
    this.socket?.emit("game:resume");
  }

  /** Ends the finished match and updates the screen after server confirmation. */
  requestLeave(): void {
    this.socket?.emit("game:leave", {}, (ack: { status: string } | null) => {
      if (ack?.status === "left") this.setState({ phase: "opponent_left" });
    });
  }

  /** Sends paddle input to the server. */
  sendInput(input: PaddleInput): void {
    this.socket?.emit("paddle:input", input);
  }

  /** Requests a ball serve after a point. */
  requestServe(): void {
    this.socket?.emit("game:serve");
  }

  /** Registers the listener for match state updates. */
  onState(listener: (state: MatchState) => void): void {
    this.onStateChange = listener;
  }
}
