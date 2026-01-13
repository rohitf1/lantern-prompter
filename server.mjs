import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const sessions = new Map();

const getSession = (sessionId) => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sessionId,
      prompterId: null,
      remotes: new Set(),
      state: null,
      pin: null,
    });
  }
  return sessions.get(sessionId);
};

const emitStatus = (io, session) => {
  const status = {
    connectedPrompter: Boolean(session.prompterId),
    connectedRemote: session.remotes.size > 0,
  };
  if (session.prompterId) {
    io.to(session.prompterId).emit("session:status", status);
  }
  session.remotes.forEach((remoteId) => {
    io.to(remoteId).emit("session:status", status);
  });
};

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    socket.on("join", (payload) => {
      const { sessionId, role, pin } = payload || {};
      if (!sessionId || !role) return;
      const session = getSession(sessionId);

      if (session.pin && pin && session.pin !== pin) {
        socket.emit("session:error", { message: "Invalid PIN" });
        return;
      }

      socket.data.sessionId = sessionId;
      socket.data.role = role;

      if (role === "prompter") {
        session.prompterId = socket.id;
      }

      if (role === "remote") {
        session.remotes.add(socket.id);
      }

      emitStatus(io, session);
      if (session.state && role === "remote") {
        socket.emit("state:update", session.state);
      }
    });

    socket.on("command", (command) => {
      const { sessionId, role } = socket.data;
      if (!sessionId || role !== "remote") return;
      const session = getSession(sessionId);
      if (session.prompterId) {
        io.to(session.prompterId).emit("command", command);
      }
    });

    socket.on("state:update", (state) => {
      const { sessionId, role } = socket.data;
      if (!sessionId || role !== "prompter") return;
      const session = getSession(sessionId);
      session.state = state;
      session.remotes.forEach((remoteId) => {
        io.to(remoteId).emit("state:update", state);
      });
    });

    socket.on("state:request", () => {
      const { sessionId, role } = socket.data;
      if (!sessionId || role !== "remote") return;
      const session = getSession(sessionId);
      if (session.state) {
        io.to(socket.id).emit("state:update", session.state);
      }
    });

    socket.on("disconnect", () => {
      const { sessionId, role } = socket.data;
      if (!sessionId) return;
      const session = getSession(sessionId);
      if (role === "prompter" && session.prompterId === socket.id) {
        session.prompterId = null;
      }
      if (role === "remote" && session.remotes.has(socket.id)) {
        session.remotes.delete(socket.id);
      }
      emitStatus(io, session);
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
