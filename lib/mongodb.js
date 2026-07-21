import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "upkeep";

if (!uri) {
  // Thrown lazily (on first DB call) rather than at import time, so the
  // app can still boot far enough to show a clear error in the browser.
}

let clientPromise;

function createClientPromise() {
  if (!uri) {
    return Promise.reject(
      new Error(
        "MONGODB_URI is not set. Add it to your .env file (see .env.example)."
      )
    );
  }
  const client = new MongoClient(uri);
  return client.connect();
}

if (process.env.NODE_ENV === "development") {
  // Reuse the connection across hot reloads in dev.
  if (!global._upkeepMongoClientPromise) {
    global._upkeepMongoClientPromise = createClientPromise();
  }
  clientPromise = global._upkeepMongoClientPromise;
} else {
  clientPromise = createClientPromise();
}

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}
