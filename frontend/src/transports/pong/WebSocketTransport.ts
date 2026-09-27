import { io, type Socket } from "socket.io-client";
import type {
  GameSnapshot,
  MatchState,
  PaddleInput,
  Side,
  Transport,
} from "../../games/pong/protocol";
import {
  EMPTY_SNAPSHOT,
  createInitialMatchState,
} from "../../games/pong/protocol";

type ServerStatus = {
  state: string;
  side?: Side;
  startsAt?: number;
  accepted?: { left: boolean; right: boolean };
};

function countdownState(
  status: ServerStatus,
  currentSide: Side | null,
): Partial<MatchState> {
  return {
    phase: "countdown",
    playerSide: status.side ?? currentSide,
    startsAt: status.startsAt ?? null,
    rematchAccepted: { left: false, right: false },
    snapshot: EMPTY_SNAPSHOT,
    errorMessage: null,
  };
}

export class WebSocketTransport implements Transport {
  private socket: Socket | null = null;
  private onStateChange: ((state: MatchState) => void) | null = null;
  private state: MatchState = createInitialMatchState();

  private setState(patch: Partial<MatchState>): void {
    this.state = { ...this.state, ...patch };
    this.onStateChange?.(this.state);
  }

  private onSnapshot(snapshot: GameSnapshot): void {
    if (this.state.phase !== "playing" && this.state.phase !== "finished") return;
    this.setState({
      snapshot,
      phase: snapshot.winner !== null ? "finished" : "playing",
    });
  }

  private onStatus(status: ServerStatus): void {
    if (status.state === "countdown") {
      this.setState(countdownState(status, this.state.playerSide));
      return;
    }
    if (status.state === "playing") {
      this.setState({ phase: "playing" });
      return;
    }
    if (status.state === "rematch_pending") {
      this.setState({
        phase: "finished",
        rematchAccepted: status.accepted ?? { left: false, right: false },
      });
      return;
    }
    if (status.state === "opponent_left") {
      this.setState({ phase: "opponent_left" });
    }
  }

  private onError(message?: string): void {
    if (this.state.phase === "finished" || this.state.snapshot.winner !== null) {
      return;
    }
    this.setState({
      phase: "error",
      errorMessage: message ?? "Tente novamente.",
    });
  }

  private waitUntilConnected(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket?.once("connect", () => resolve());
      this.socket?.once("connect_error", (error) => reject(error));
    });
  }

  private joinQueue(): Promise<{ status: string }> {
    return new Promise((resolve, reject) => {
      this.socket?.emit("queue:join", {}, (ack: { status: string } | null) => {
        if (ack) resolve(ack);
        else reject(new Error("queue:join sem ack"));
      });
    });
  }

  async connect(): Promise<void> {
    this.state = createInitialMatchState();
    this.setState({ phase: "connecting" });
    this.socket = io({ transports: ["websocket"] });
    this.socket.on("game:snapshot", (s) => this.onSnapshot(s));
    this.socket.on("game:status", (s) => this.onStatus(s));
    this.socket.on("game:error", (e: { message?: string }) => this.onError(e.message));
    await this.waitUntilConnected();
    const ack = await this.joinQueue();
    if (ack.status === "waiting") this.setState({ phase: "waiting" });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.onStateChange = null;
  }

  requestRematch(): void {
    this.socket?.emit("game:rematch");
  }

  sendInput(input: PaddleInput): void {
    this.socket?.emit("paddle:input", input);
  }

  onState(listener: (state: MatchState) => void): void {
    this.onStateChange = listener;
  }
}
