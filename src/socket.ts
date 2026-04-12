import { Server, Socket } from "socket.io";

let io: Server;

export function initSocket(server: Server): void {
  io = server;

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join", (userId: string) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room: ${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
