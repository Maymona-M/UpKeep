// Usage: node scripts/create-account.js "email@example.com" "password" ["Household Name"]
// Creates a new UpKeep account directly in the database - useful for
// testing multi-account separation before the signup page exists, or for
// an admin creating an account on someone's behalf.
require("dotenv").config();
const crypto = require("crypto");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const [, , email, password, householdName] = process.argv;

  if (!email || !password) {
    console.error('Usage: node scripts/create-account.js "email@example.com" "password" ["Household Name"]');
    process.exit(1);
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) {
    console.error("That doesn't look like a valid email address.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env first.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "upkeep");
  const users = db.collection("users");

  await users.createIndex({ email: 1 }, { unique: true }).catch(() => {});
  await users.createIndex({ viewToken: 1 }, { unique: true }).catch(() => {});

  const existing = await users.findOne({ email: cleanEmail });
  if (existing) {
    console.error(`An account with ${cleanEmail} already exists (id: ${existing._id}).`);
    await client.close();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const doc = {
    email: cleanEmail,
    passwordHash,
    householdName: (householdName || "").trim(),
    viewToken: crypto.randomBytes(24).toString("hex"),
    notificationEmails: [cleanEmail],
    resetTokenHash: null,
    resetTokenExpires: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await users.insertOne(doc);

  console.log("\nAccount created:");
  console.log(`  email:      ${cleanEmail}`);
  console.log(`  password:   ${password}`);
  console.log(`  user id:    ${result.insertedId}`);
  console.log(`  view token: ${doc.viewToken}`);
  console.log(`  family link (once your app URL is known): <your-app-url>/view/${doc.viewToken}\n`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
