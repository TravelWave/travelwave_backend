import { Server } from "socket.io";
import { httpServer } from "./server";

export const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("joinRoom", (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  socket.on("leaveRoom", (userId: string) => {
    socket.leave(userId);
    console.log(`User ${userId} left room ${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});
