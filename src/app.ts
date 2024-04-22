import "./common/env";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import routes from "./common/routes";
import errorHandler from "./middlewares/errorHandler";
import cron from "node-cron";
import logger from "./common/logger";
import bodyParser from "body-parser";

const app: Application = express();

app.disable("x-powered-by");
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.REQUEST_LIMIT || "100kb",
  })
);
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({
    "health-check": "OK: top level api working",
  });
});

cron.schedule("*/14 * * * *", () => {
  logger.info("Running health check every 14 minutes");
});

app.use("/v1/", routes);
app.use(errorHandler);

export default app;
