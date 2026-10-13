import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";

const backendMeUrl = process.env.BACKEND_ME_URL ?? "http://backend:8000/api/me";
const port = Number(process.env.PORT ?? 3001);

const nicknames = new Map();
/** Avatares (data URL) por id de usuário. */
const avatars = new Map();
/** Versão do avatar para cache-bust na URL pública. */
const avatarVersions = new Map();
const presence = new Map();
/** Catálogo de usuários conhecidos pelo mock. */
const users = new Map();

/** Relações: { fromId, toId, status: "pending" | "accepted" } */
const edges = [];

/** Mensagens do chat global. */
const globalChatMessages = [];
/** Mensagens privadas por conversationId. */
const privateChatMessages = new Map();

const app = express();
app.use(express.json({ limit: "1mb" }));

async function resolveUser(cookieHeader) {
  if (!cookieHeader) return null;

  const response = await fetch(backendMeUrl, {
    headers: { Cookie: cookieHeader },
  });
  if (!response.ok) return null;

  const data = await response.json();
  const id = Number(data.id);
  const nickname = String(data.nickname ?? "").trim();
  if (!Number.isFinite(id) || !nickname) return null;

  nicknames.set(id, nickname);
  users.set(id, { id, nickname });
  return { id, nickname };
}

function isOnline(userId) {
  return presence.get(userId)?.online === true;
}

/** URL pública leve do avatar (evita mandar base64 no socket). */
function publicAvatarUrl(userId) {
  if (!avatars.has(userId)) return null;
  const version = avatarVersions.get(userId) ?? 0;
  return `/mock/avatar/${userId}?v=${version}`;
}

function friendsListFor(userId) {
  const list = [];

  for (const edge of edges) {
    let otherId = null;
    let relation = null;

    if (edge.fromId === userId) {
      otherId = edge.toId;
      relation = edge.status === "pending" ? "outgoing" : "friend";
    } else if (edge.toId === userId) {
      otherId = edge.fromId;
      relation = edge.status === "pending" ? "incoming" : "friend";
    } else {
      continue;
    }

    const profile = users.get(otherId);
    if (!profile) continue;

    list.push({
      id: profile.id,
      nickname: profile.nickname,
      avatarUrl: publicAvatarUrl(otherId),
      online: isOnline(otherId),
      status: edge.status,
      relation,
    });
  }

  return list;
}

/** Resolve o nickname de um usuário pelo id. */
function nicknameFor(id) {
  return nicknames.get(id) ?? users.get(id)?.nickname ?? null;
}

app.get("/mock/avatar/:id", (req, res) => {
  const id = Number(req.params.id);
  const dataUrl = avatars.get(id);
  if (!Number.isFinite(id) || dataUrl == null) {
    res.status(404).end();
    return;
  }
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/s.exec(dataUrl);
  if (match == null) {
    res.status(500).end();
    return;
  }
  res.setHeader("Content-Type", match[1]);
  res.setHeader("Cache-Control", "no-cache");
  res.send(Buffer.from(match[2], "base64"));
});

app.get("/mock/profile", (req, res) => {
  const id = Number(req.query.id);
  const nickname = nicknameFor(id);
  if (!Number.isFinite(id) || nickname == null) {
    res.status(404).end();
    return;
  }
  res.json({
    id,
    nickname,
    avatarUrl: publicAvatarUrl(id),
  });
});

app.patch("/mock/profile", (req, res) => {
  const id = Number(req.body?.id);
  const nickname = String(req.body?.nickname ?? "").trim();
  if (!Number.isFinite(id) || !nickname) {
    res.status(400).end();
    return;
  }
  nicknames.set(id, nickname);
  const profile = users.get(id);
  if (profile) users.set(id, { ...profile, nickname });
  res.json({
    id,
    email: String(req.body?.email ?? ""),
    nickname,
    avatarUrl: publicAvatarUrl(id),
  });
});

app.post("/mock/profile/avatar", async (req, res) => {
  const user = await resolveUser(req.headers.cookie);
  if (user == null) {
    res.status(401).end();
    return;
  }
  const avatarDataUrl = String(req.body?.avatarDataUrl ?? "").trim();
  if (!avatarDataUrl.startsWith("data:image/")) {
    res.status(400).json({ error: "avatarDataUrl inválido" });
    return;
  }
  if (avatarDataUrl.length > 800_000) {
    res.status(400).json({ error: "imagem muito grande (máx. 600KB)" });
    return;
  }
  avatars.set(user.id, avatarDataUrl);
  avatarVersions.set(user.id, Date.now());
  nicknames.set(user.id, user.nickname);
  users.set(user.id, { id: user.id, nickname: user.nickname });
  const avatarUrl = publicAvatarUrl(user.id);
  broadcastFriends();
  res.json({
    id: user.id,
    nickname: user.nickname,
    avatarUrl,
  });
});

app.post("/mock/friends", async (req, res) => {
  const user = await resolveUser(req.headers.cookie);
  if (user == null) {
    res.status(401).end();
    return;
  }

  const friendNickname = String(req.body?.nickname ?? "").trim();
  if (!friendNickname) {
    res.status(400).json({ error: "nickname obrigatório" });
    return;
  }

  let friend = null;
  for (const entry of users.values()) {
    if (entry.nickname === friendNickname) {
      friend = entry;
      break;
    }
  }

  if (friend == null) {
    res.status(404).json({ error: "usuário não encontrado" });
    return;
  }
  if (friend.id === user.id) {
    res.status(400).json({ error: "não pode adicionar a si mesmo" });
    return;
  }

  const exists = edges.some(
    (edge) =>
      (edge.fromId === user.id && edge.toId === friend.id) ||
      (edge.fromId === friend.id && edge.toId === user.id),
  );
  if (exists) {
    res.status(409).json({ error: "relação já existe" });
    return;
  }

  edges.push({ fromId: user.id, toId: friend.id, status: "pending" });
  broadcastFriends();
  res.status(201).json({
    id: friend.id,
    nickname: friend.nickname,
    online: isOnline(friend.id),
    status: "pending",
    relation: "outgoing",
  });
});

app.delete("/mock/friends/:friendId", async (req, res) => {
  const user = await resolveUser(req.headers.cookie);
  if (user == null) {
    res.status(401).end();
    return;
  }

  const friendId = Number(req.params.friendId);
  if (!Number.isFinite(friendId)) {
    res.status(400).end();
    return;
  }

  for (let index = edges.length - 1; index >= 0; index -= 1) {
    const edge = edges[index];
    const involves =
      (edge.fromId === user.id && edge.toId === friendId) ||
      (edge.fromId === friendId && edge.toId === user.id);
    if (involves) edges.splice(index, 1);
  }

  broadcastFriends();
  res.status(204).end();
});

app.post("/mock/friends/:fromId/accept", async (req, res) => {
  const user = await resolveUser(req.headers.cookie);
  if (user == null) {
    res.status(401).end();
    return;
  }

  const fromId = Number(req.params.fromId);
  if (!Number.isFinite(fromId)) {
    res.status(400).end();
    return;
  }

  const edge = edges.find(
    (item) =>
      item.fromId === fromId &&
      item.toId === user.id &&
      item.status === "pending",
  );
  if (!edge) {
    res.status(404).json({ error: "convite não encontrado" });
    return;
  }

  edge.status = "accepted";
  broadcastFriends();
  res.status(200).json({
    id: fromId,
    nickname: users.get(fromId)?.nickname ?? "",
    online: isOnline(fromId),
    status: "accepted",
    relation: "friend",
  });
});

app.post("/mock/friends/:fromId/reject", async (req, res) => {
  const user = await resolveUser(req.headers.cookie);
  if (user == null) {
    res.status(401).end();
    return;
  }

  const fromId = Number(req.params.fromId);
  if (!Number.isFinite(fromId)) {
    res.status(400).end();
    return;
  }

  const index = edges.findIndex(
    (item) =>
      item.fromId === fromId &&
      item.toId === user.id &&
      item.status === "pending",
  );
  if (index === -1) {
    res.status(404).json({ error: "convite não encontrado" });
    return;
  }

  edges.splice(index, 1);
  broadcastFriends();
  res.status(204).end();
});

/** Identificador estável da conversa privada (par de user ids ordenados). */
function privateConversationId(userIdA, userIdB) {
  return [userIdA, userIdB].sort((left, right) => left - right).join(":");
}

/** True se A e B têm edge accepted (amizade bilateral). */
function areAcceptedFriends(userIdA, userIdB) {
  return edges.some(
    (edge) =>
      edge.status === "accepted" &&
      ((edge.fromId === userIdA && edge.toId === userIdB) ||
        (edge.fromId === userIdB && edge.toId === userIdA)),
  );
}

/** Outro participante a partir do conversationId "a:b". */
function otherUserIdFromConversation(conversationId, userId) {
  const [left, right] = conversationId.split(":").map(Number);
  if (left === userId) return right;
  if (right === userId) return left;
  return null;
}

/** Histórico de chat visível para o usuário autenticado. */
function chatHistoryFor(userId) {
  const conversations = [];
  for (const [conversationId, messages] of privateChatMessages) {
    const otherUserId = otherUserIdFromConversation(conversationId, userId);
    if (otherUserId == null) continue;
    const other = users.get(otherUserId);
    conversations.push({
      conversationId,
      otherUserId,
      otherNickname: other?.nickname ?? `user ${otherUserId}`,
      messages,
    });
  }
  return { global: globalChatMessages, conversations };
}

/** Persiste e devolve mensagem do chat global. */
function storeGlobalMessage(userId, nickname, text) {
  const message = {
    id: randomUUID(),
    userId,
    nickname,
    avatarUrl: publicAvatarUrl(userId),
    text,
    createdAt: Date.now(),
  };
  globalChatMessages.push(message);
  return message;
}

/** Persiste e devolve mensagem privada (só se forem friends). */
function storePrivateMessage(userId, nickname, otherUserId, text) {
  if (!areAcceptedFriends(userId, otherUserId)) return null;
  const conversationId = privateConversationId(userId, otherUserId);
  const message = {
    id: randomUUID(),
    userId,
    nickname,
    avatarUrl: publicAvatarUrl(userId),
    otherUserId,
    conversationId,
    text,
    createdAt: Date.now(),
  };
  const list = privateChatMessages.get(conversationId) ?? [];
  list.push(message);
  privateChatMessages.set(conversationId, list);
  return message;
}

app.get("/mock/chat/history", async (req, res) => {
  const user = await resolveUser(req.headers.cookie);
  if (user == null) {
    res.status(401).end();
    return;
  }
  users.set(user.id, { id: user.id, nickname: user.nickname });
  res.json(chatHistoryFor(user.id));
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/mock/chat/socket/",
  cors: { origin: "*" },
});

const friendsIo = new Server(httpServer, {
  path: "/mock/friends/socket/",
  cors: { origin: "*" },
});

function broadcastFriends() {
  for (const socket of friendsIo.sockets.sockets.values()) {
    const userId = socket.data.userId;
    if (userId == null) continue;
    socket.emit("friends:update", friendsListFor(userId));
  }
}

io.on("connection", (socket) => {
  void resolveUser(socket.handshake.headers.cookie).then((user) => {
    if (user == null) {
      socket.disconnect();
      return;
    }
    socket.data.userId = user.id;
    socket.data.nickname = user.nickname;
    users.set(user.id, { id: user.id, nickname: user.nickname });
    socket.join(`user:${user.id}`);
  });

  /** Chat global: grava e emite para todos. */
  socket.on("chat:send", (payload) => {
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!text || socket.data.userId == null) return;
    const message = storeGlobalMessage(
      socket.data.userId,
      socket.data.nickname,
      text,
    );
    io.emit("chat:message", message);
  });

  /** Chat privado: grava se friends; emite só para o par. */
  socket.on("chat:private:send", (payload) => {
    const otherUserId = Number(payload?.otherUserId);
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!Number.isFinite(otherUserId) || !text || socket.data.userId == null) {
      return;
    }
    const message = storePrivateMessage(
      socket.data.userId,
      socket.data.nickname,
      otherUserId,
      text,
    );
    if (message == null) {
      socket.emit("chat:private:error", {
        message: "só é possível conversar com friends aceitos",
      });
      return;
    }
    io.to(`user:${socket.data.userId}`).emit("chat:private:message", message);
    io.to(`user:${otherUserId}`).emit("chat:private:message", message);
  });

  socket.on("chat:private:typing", (payload) => {
    const otherUserId = Number(payload?.otherUserId);
    const isTyping = payload?.isTyping === true;
    if (!Number.isFinite(otherUserId) || socket.data.userId == null) return;
    if (!areAcceptedFriends(socket.data.userId, otherUserId)) return;
    io.to(`user:${otherUserId}`).emit("chat:private:typing", {
      userId: socket.data.userId,
      nickname: socket.data.nickname,
      conversationId: privateConversationId(socket.data.userId, otherUserId),
      isTyping,
    });
  });

  socket.on("chat:private:read", (payload) => {
    const otherUserId = Number(payload?.otherUserId);
    const lastMessageId = String(payload?.lastMessageId ?? "");
    if (!Number.isFinite(otherUserId) || !lastMessageId) return;
    if (socket.data.userId == null) return;
    if (!areAcceptedFriends(socket.data.userId, otherUserId)) return;
    io.to(`user:${otherUserId}`).emit("chat:private:read", {
      userId: socket.data.userId,
      conversationId: privateConversationId(socket.data.userId, otherUserId),
      lastMessageId,
    });
  });
});

friendsIo.on("connection", (socket) => {
  void resolveUser(socket.handshake.headers.cookie).then((user) => {
    if (user == null) {
      socket.disconnect();
      return;
    }
    users.set(user.id, { id: user.id, nickname: user.nickname });
    presence.set(user.id, { id: user.id, nickname: user.nickname, online: true });
    socket.data.userId = user.id;
    broadcastFriends();
  });

  socket.on("disconnect", () => {
    const userId = socket.data.userId;
    if (userId == null) return;

    const current = presence.get(userId);
    if (!current) return;

    presence.set(userId, { ...current, online: false });
    broadcastFriends();
  });
});

httpServer.listen(port);
