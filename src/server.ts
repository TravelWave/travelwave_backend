import "./common/env";
import app from "./app";
import * as os from "os";
import logger from "./common/logger";
import { createServer } from "http";
import { io } from "./socket";

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
