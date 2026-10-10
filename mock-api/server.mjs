import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";

const backendMeUrl = process.env.BACKEND_ME_URL ?? "http://backend:8000/api/me";
const port = Number(process.env.PORT ?? 3001);

const nicknames = new Map();
const presence = new Map();
/** Catálogo de users (simula tabela users do BD). */
const users = new Map();

/** Relações: { fromId, toId, status: "pending" | "accepted" } */
const edges = [];

const app = express();
app.use(express.json());

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

  return { id, nickname };
}

function isOnline(userId) {
  return presence.get(userId)?.online === true;
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
      online: isOnline(otherId),
      status: edge.status,
      relation,
    });
  }

  return list;
}

app.get("/mock/profile", (req, res) => {
  const id = Number(req.query.id);
  const nickname = nicknames.get(id);
  if (!Number.isFinite(id) || nickname == null) {
    res.status(404).end();
    return;
  }
  res.json({ id, nickname });
});

app.patch("/mock/profile", (req, res) => {
  const id = Number(req.body?.id);
  const nickname = String(req.body?.nickname ?? "").trim();
  if (!Number.isFinite(id) || !nickname) {
    res.status(400).end();
    return;
  }
  nicknames.set(id, nickname);
  res.json({ id, email: String(req.body?.email ?? ""), nickname });
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

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/mock/chat/",
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
  socket.on("chat:send", (payload) => {
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!text) return;

    io.emit("chat:message", {
      id: randomUUID(),
      userId: Number(payload?.userId) || 0,
      nickname: String(payload?.nickname ?? "anon"),
      text,
      createdAt: Date.now(),
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
