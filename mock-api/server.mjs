import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";

const port = Number(process.env.PORT ?? 3001);
const nicknames = new Map();

const app = express();
app.use(express.json());

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

const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: "/mock/chat/",
  cors: { origin: "*" },
});

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

httpServer.listen(port);
