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

/**
 * Define o estado do servidor para o jogo.
 */
type ServerStatus = {
  /** Estado atual do servidor. */
  state: string;
  /** Lado do jogador (esquerdo ou direito). */
  side?: Side;
  /** Momento em que a contagem regressiva começa. */
  startsAt?: number;
  /** Indica se o jogador aceitou o rematch. */
  accepted?: { left: boolean; right: boolean };
};

/**
 * Cria o estado de contagem regressiva do jogo com base no status do servidor e no lado atual do jogador.
 * @param status - Estado atual do servidor.
 * @param currentSide - Lado atual do jogador (esquerdo ou direito).
 */
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

/**
 * Transporte Socket.IO do Pong.
 * Conecta ao servidor, sincroniza o estado da partida e envia entrada do jogador.
 */
export class WebSocketTransport implements Transport {
  private socket: Socket | null = null;
  private onStateChange: ((state: MatchState) => void) | null = null;
  private state: MatchState = createInitialMatchState();

  /** Aplica um patch parcial ao estado local e notifica o listener. */
  private setState(patch: Partial<MatchState>): void {
    this.state = { ...this.state, ...patch };
    this.onStateChange?.(this.state);
  }

  /** Atualiza o estado com um snapshot recebido do servidor. */
  private onSnapshot(snapshot: GameSnapshot): void {
    if (this.state.phase !== "playing" && this.state.phase !== "finished") return;
    this.setState({
      snapshot,
      phase: snapshot.winner !== null ? "finished" : "playing",
    });
  }

  /** Interpreta eventos de status do servidor e atualiza a fase da partida. */
  private onStatus(status: ServerStatus): void {
    const playerSide = status.side ?? this.state.playerSide;
    switch (status.state) {
      case "countdown":
        this.setState(countdownState(status, playerSide));
        break;
      case "playing":
      case "finished":
        this.setState({ phase: status.state, playerSide });
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

  /** Atualiza status de retorno a partida após alguma saida. */
  private onAcceptanceStatus(status: ServerStatus, playerSide: Side | null): void {
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

  /** Marca a partida em erro, exceto quando já finalizada. */
  private onError(message?: string): void {
    if (this.state.phase === "finished" || this.state.snapshot.winner !== null) {
      return;
    }
    this.setState({
      phase: "error",
      errorMessage: message ?? "Tente novamente.",
    });
  }

  /** Aguarda o socket conectar ou rejeita em falha de conexão. */
  private waitUntilConnected(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket?.once("connect", () => resolve());
      this.socket?.once("connect_error", (error) => reject(error));
    });
  }

  /** Entra na fila de matchmaking e devolve o ack do servidor. */
  private joinQueue(): Promise<{ status: string }> {
    return new Promise((resolve, reject) => {
      this.socket?.emit("queue:join", {}, (ack: { status: string } | null) => {
        if (ack) resolve(ack);
        else reject(new Error("queue:join sem ack"));
      });
    });
  }

  /** Reingressa na fila após uma reconexão do Socket.IO. */
  private async rejoinAfterReconnect(): Promise<void> {
    const ack = await this.joinQueue();
    if (ack.status === "waiting") this.setState({ phase: "waiting" });
  }

  /** Registra os eventos da conexão do jogo. */
  private bindSocketEvents(socket: Socket): void {
    socket.on("game:snapshot", (snapshot) => this.onSnapshot(snapshot));
    socket.on("game:status", (status) => this.onStatus(status));
    socket.on("game:error", (error: { message?: string }) => this.onError(error.message));
    socket.on("disconnect", () => {
      if (this.state.phase === "playing") this.setState({ phase: "connecting" });
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

  /** Conecta ao servidor Socket.IO e entra na fila de partida. */
  async connect(): Promise<void> {
    this.state = createInitialMatchState();
    this.setState({ phase: "connecting" });
    this.socket = io({ transports: ["websocket"] });
    this.bindSocketEvents(this.socket);
    await this.waitUntilConnected();
    const ack = await this.joinQueue();
    if (ack.status === "waiting") this.setState({ phase: "waiting" });
  }

  /** Encerra a conexão Socket.IO e limpa o listener de estado. */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.onStateChange = null;
  }

  /** Solicita rematch ao servidor. */
  requestRematch(): void {
    this.socket?.emit("game:rematch");
  }

  /** Aceita retomar a partida pausada. */
  requestResume(): void {
    this.socket?.emit("game:resume");
  }

  /** Encerra a partida finalizada e atualiza a tela após confirmação do servidor. */
  requestLeave(): void {
    this.socket?.emit("game:leave", {}, (ack: { status: string } | null) => {
      if (ack?.status === "left") this.setState({ phase: "opponent_left" });
    });
  }

  /** Envia a entrada da paddle ao servidor. */
  sendInput(input: PaddleInput): void {
    this.socket?.emit("paddle:input", input);
  }

  /** Registra o listener de atualizações de estado da partida. */
  onState(listener: (state: MatchState) => void): void {
    this.onStateChange = listener;
  }
}
