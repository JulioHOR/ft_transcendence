import { io, type Socket } from "socket.io-client";
import type {
  GameSnapshot,
  PaddleInput,
  Transport,
} from "../../games/pong/protocol";
export class WebSocketTransport implements Transport {
  private socket: Socket | null = null;
  private listener: ((snapshot: GameSnapshot) => void) | null = null;
  async connect(): Promise<void> {
    this.socket = io({ transports: ["websocket"] });
    this.socket.on("game:snapshot", (snapshot: GameSnapshot) => {
      this.listener?.(snapshot);
    });
    return new Promise((resolve, reject) => {
      this.socket?.emit("queue:join", {}, (ack: { status: string } | null) => {
        if (ack !== null && ack !== undefined) {
          resolve();
        } else {
          reject(new Error("queue:join sem ack"));
        }
      });
    });
  }
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.listener = null;
  }
  restart(): void {
    this.socket?.emit("game:restart");
  }
  sendInput(input: PaddleInput): void {
    this.socket?.emit("paddle:input", input);
  }
  onSnapshot(listener: (snapshot: GameSnapshot) => void): void {
    this.listener = listener;
  }
}
