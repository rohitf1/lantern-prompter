import { io, Socket } from "socket.io-client";
import type { JoinPayload } from "@/types/messages";

let socket: Socket | null = null;
let lastJoinPayload: JoinPayload | null = null;
let didSetupReconnect = false;

export const getSocket = () => {
  if (!socket) {
    socket = io({ transports: ["websocket"] });
  }
  return socket;
};

export const joinSession = (payload: JoinPayload) => {
  const active = getSocket();
  lastJoinPayload = payload;
  active.emit("join", payload);
  if (!didSetupReconnect) {
    didSetupReconnect = true;
    active.on("connect", () => {
      if (lastJoinPayload) {
        active.emit("join", lastJoinPayload);
      }
    });
  }
  return active;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
  lastJoinPayload = null;
  didSetupReconnect = false;
};
