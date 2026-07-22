import { MongoClient } from "mongodb";

const dbName = process.env.MONGODB_DB || "upkeep";

function createClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(
      new Error(
        "MONGODB_URI is not set. Add it to your .env file locally, or to your Vercel project's Environment Variables when deployed."
      )
    );
  }
  const client = new MongoClient(uri);
  return client.connect();
}

// Connects lazily, on first actual use - never at module import time. This
// matters because Next.js briefly imports route files during the build
// step (to inspect their config) even for pages that never touch the
// database at build time; connecting eagerly there caused a harmless but
// noisy error in build logs. Reused across calls within the same server
// instance (and across dev hot-reloads) so we don't open a new connection
// per request.
function getClientPromise() {
  if (!global._upkeepMongoClientPromise) {
    global._upkeepMongoClientPromise = createClientPromise();
  }
  return global._upkeepMongoClientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(dbName);
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}
