import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer: { getUri: () => any; stop: () => any };

/**
 * Connect to mock memory db
 */
export const connect = async () => {
  await mongoose.disconnect();

  mongoServer = await MongoMemoryServer.create();
  const URI = await mongoServer.getUri();

  mongoose
    .connect(URI)
    .then(() => {
      console.log(`Connected to mongo testing server at ${URI}`);
    })
    .catch((err) => {
      console.log(err);
    });
};

export const closeDatabase = async () => {
  await mongoose.disconnect();
};

export const clearDatabase = async () => {
  const collections = await mongoose.connection.db.collections();

  for (let i = 0; i < collections.length; i += 1) {
    /* eslint-disable-next-line no-await-in-loop */
    await collections[i].deleteMany({});
  }
};
