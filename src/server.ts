import "./common/env";
import app from "./app";
import * as os from "os";
import logger from "./common/logger";
import { createServer } from "http";
import { io } from "./socket";
import chatController from "./resources/chat/controller";

const PORT = process.env.PORT || 8000;

export const httpServer = createServer(app);

// io.on("connection", (socket) => {
//   logger.info("a user connected");
//   socket.on("disconnect", () => {
//     logger.info("user disconnected");
//   });
// });

io.on("connection", (socket) => {
  logger.info("a user connected");

  socket.on("join", (userId) => {
    // Join a room specific to the user (driver or passenger)
    socket.join(userId);
  });

  socket.on("private message", async ({ senderId, recipientId, message }) => {
    // await chatController.handlePrivateMessage(senderId, recipientId, message);

    io.to(recipientId).emit("private message", { senderId, message });
  });

  socket.on("typing", (recipientId) => {
    io.to(recipientId).emit("typing", true);
  });

  socket.on("stop typing", (recipientId) => {
    io.to(recipientId).emit("typing", false);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    logger.info("user disconnected");
  });
});

io.listen(httpServer);

httpServer.listen(PORT, () => {
  logger.info(
    `up and running in ${
      process.env.NODE_ENV || "development"
    } @: ${os.hostname()} on port ${PORT}`
  );
});
