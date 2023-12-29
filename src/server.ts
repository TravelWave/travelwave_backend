import "./common/env";
import app from "./app";
import * as os from "os";
import logger from "./common/logger";

const PORT = process.env.PORT;

app.listen(PORT, () => {
  logger.info(
    `up and running in ${
      process.env.NODE_ENV || "development"
    } @: ${os.hostname()} on port ${PORT}`
  );
});
