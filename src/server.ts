import "./common/env";
import app from "./app";
import * as os from "os";
import logger from "./common/logger";
import { createServer } from "http";
import { io } from "./socket";

const PORT = process.env.PORT || 8000;

export const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  logger.info(
    `up and running in ${
      process.env.NODE_ENV || "development"
    } @: ${os.hostname()} on port ${PORT}`
  );
});

io.listen(httpServer);
