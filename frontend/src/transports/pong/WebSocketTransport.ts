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
  you?: Side;
  startsAt?: number;
  accepted?: { left: boolean; right: boolean };
  message?: string;
};

export class WebSocketTransport implements Transport {
  private socket: Socket | null = null;
  private onStateChange: ((state: MatchState) => void) | null = null;
  private state: MatchState = createInitialMatchState();

  private setState(patch: Partial<MatchState>): void {
    this.state = { ...this.state, ...patch };
    this.onStateChange?.(this.state);
  }

  private applyServerStatus(status: ServerStatus): void {
    switch (status.state) {
      case "countdown":
        this.setState({
          phase: "countdown",
          you: status.you ?? this.state.you,
          startsAt: status.startsAt ?? null,
          rematchAccepted: { left: false, right: false },
          snapshot: EMPTY_SNAPSHOT,
          errorMessage: null,
        });
        return;
      case "playing":
        this.setState({ phase: "playing" });
        return;
      case "rematch_pending":
        this.setState({
          phase: "finished",
          rematchAccepted: status.accepted ?? { left: false, right: false },
        });
        return;
      case "opponent_left":
        this.setState({ phase: "opponent_left" });
        return;
    }
  }

  async connect(): Promise<void> {
    this.state = createInitialMatchState();
    this.setState({ phase: "connecting" });

    this.socket = io({ transports: ["websocket"] });

    this.socket.on("game:snapshot", (snapshot: GameSnapshot) => {
      if (this.state.phase !== "playing" && this.state.phase !== "finished") {
        return;
      }
      this.setState({
        snapshot,
        phase: snapshot.winner !== null ? "finished" : "playing",
      });
    });

    this.socket.on("game:status", (status: ServerStatus) => {
      this.applyServerStatus(status);
    });

    this.socket.on("game:error", (err: { message?: string }) => {
      this.setState({
        phase: "error",
        errorMessage: err.message ?? "Erro na partida.",
      });
    });

    await new Promise<void>((resolve, reject) => {
      this.socket?.once("connect", () => resolve());
      this.socket?.once("connect_error", (error) => reject(error));
    });

    const ack = await new Promise<{ status: string }>((resolve, reject) => {
      this.socket?.emit("queue:join", {}, (response: { status: string } | null) => {
        if (response) resolve(response);
        else reject(new Error("queue:join sem ack"));
      });
    });

    if (ack.status === "waiting") {
      this.setState({ phase: "waiting" });
    }
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
