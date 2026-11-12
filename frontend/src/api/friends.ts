import { io, type Socket } from "socket.io-client";
import { apiFetch } from "./api";
import { friendsUrl, socketPath } from "./endpoints";
import { errorMessage } from "./http";

/** Friend displayed in the presence list. */
export type Friend = {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  online: boolean;
  status: "pending" | "accepted";
  relation: "outgoing" | "incoming" | "friend";
};

/** Presence/friends transport via Socket.IO. */
export type FriendsTransport = {
  connect(): Promise<void>;
  disconnect(): void;
  onUpdate(handler: (friends: Friend[]) => void): void;
};

/** State of the friends/presence transport via Socket.IO. */
type FriendsSocketState = {
  socket: Socket | null;
  updateHandler: ((friends: Friend[]) => void) | null;
};

/** Waits for the socket to connect or fail. */
function waitForConnection(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

/** Connects to the friends/presence Socket.IO. */
async function connectFriends(state: FriendsSocketState): Promise<void> {
  state.socket = io({
    path: socketPath,
    withCredentials: true,
  });

  state.socket.on("friends:update", (friends: Friend[]) => {
    state.updateHandler?.(friends);
  });

  await waitForConnection(state.socket);
}

/** Disconnects from the friends/presence Socket.IO. */
function disconnectFriends(state: FriendsSocketState): void {
  state.socket?.disconnect();
  state.socket = null;
  state.updateHandler = null;
}

/** Creates a friends/presence transport via Socket.IO. */
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

/** Adds a friend by nickname. */
export async function addFriend(nickname: string): Promise<Friend> {
  const response = await apiFetch(friendsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao adicionar amigo"));
  }
  return response.json() as Promise<Friend>;
}

/** Removes a friend by ID. */
export async function removeFriend(friendId: number): Promise<void> {
  const response = await apiFetch(`${friendsUrl}/${friendId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao remover amigo"));
  }
}

/** Accepts a friend request. */
export async function acceptFriend(friendId: number): Promise<Friend> {
  const response = await apiFetch(`${friendsUrl}/${friendId}/accept`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao aceitar convite"));
  }
  return response.json() as Promise<Friend>;
}

/** Declines a friend request. */
export async function rejectFriend(friendId: number): Promise<void> {
  const response = await apiFetch(`${friendsUrl}/${friendId}/reject`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao recusar convite"));
  }
}
