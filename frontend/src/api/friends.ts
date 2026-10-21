import { io, type Socket } from "socket.io-client";
import { friendsSocketPath, friendsUrl } from "./endpoints";
import { errorMessage } from "./http";

/** Amigo exibido na lista de presença. */
export type Friend = {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  online: boolean;
  status: "pending" | "accepted";
  relation: "outgoing" | "incoming" | "friend";
};

/** Transporte de presença/friends via Socket.IO. */
export type FriendsTransport = {
  connect(): Promise<void>;
  disconnect(): void;
  onUpdate(handler: (friends: Friend[]) => void): void;
};

/** Estado do transporte de friends/presença via Socket.IO. */
type FriendsSocketState = {
  socket: Socket | null;
  updateHandler: ((friends: Friend[]) => void) | null;
};

/** Espera o socket conectar ou falhar. */
function waitForConnection(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

/** Conecta ao Socket.IO de friends/presença. */
async function connectFriends(state: FriendsSocketState): Promise<void> {
  state.socket = io({
    path: friendsSocketPath,
    withCredentials: true,
  });

  state.socket.on("friends:update", (friends: Friend[]) => {
    state.updateHandler?.(friends);
  });

  await waitForConnection(state.socket);
}

/** Desconecta do Socket.IO de friends/presença. */
function disconnectFriends(state: FriendsSocketState): void {
  state.socket?.disconnect();
  state.socket = null;
  state.updateHandler = null;
}

/** Cria um transporte de friends/presença via Socket.IO. */
export function createFriendsTransport(): FriendsTransport {
  const state: FriendsSocketState = { socket: null, updateHandler: null };
  return {
    connect: () => connectFriends(state),
    disconnect: () => disconnectFriends(state),
    onUpdate: (handler) => {
      state.updateHandler = handler;
    },
  };
}

/** Adiciona um friend pelo nickname. */
export async function addFriend(nickname: string): Promise<Friend> {
  const response = await fetch(friendsUrl, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao adicionar amigo"));
  }
  return response.json() as Promise<Friend>;
}

/** Remove um friend pelo id. */
export async function removeFriend(friendId: number): Promise<void> {
  const response = await fetch(`${friendsUrl}/${friendId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao remover amigo"));
  }
}

export async function acceptFriend(friendId: number): Promise<Friend> {
  const response = await fetch(`${friendsUrl}/${friendId}/accept`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao aceitar convite"));
  }
  return response.json() as Promise<Friend>;
}

export async function rejectFriend(friendId: number): Promise<void> {
  const response = await fetch(`${friendsUrl}/${friendId}/reject`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao recusar convite"));
  }
}
