import mongoose from "mongoose";
import logger from "../common/logger";

const DB_URI = process.env.MONGODB_URI;

mongoose.connect(DB_URI);

mongoose.Promise = global.Promise;

// Get current connected Database
const db = mongoose.connection;

// Notify on error or success
db.on("error", (err) => logger.error("connection with db error", err));
db.on("close", () => logger.info("connection closed to db"));
db.once("open", () =>
  logger.info(`Connected to the database instance on ${DB_URI}`)
);

export default {
  Connection: db,
};