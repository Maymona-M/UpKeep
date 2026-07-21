// Usage: node scripts/reset-admin-password.js "123"
require("dotenv").config();
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: node scripts/reset-admin-password.js "your-password"');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "upkeep";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const hash = await bcrypt.hash(password, 12);
  const result = await db.collection("settings").updateOne(
    { _id: "singleton" },
    { $set: { adminPasswordHash: hash, updatedAt: new Date() } },
    { upsert: true }
  );

  console.log("Matched:", result.matchedCount, "Upserted:", result.upsertedCount);
  console.log("Password hash written directly to the database.");
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });