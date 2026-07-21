// Usage: npm run seed
// Inserts a handful of example obligations so you can see the dashboard
// populated right away. Safe to run multiple times against a fresh DB;
// it only inserts if the obligations collection is currently empty.
require("dotenv").config();
const { MongoClient } = require("mongodb");

function addDays(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env first.");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "upkeep");
  const col = db.collection("obligations");

  const count = await col.countDocuments();
  if (count > 0) {
    console.log(`obligations collection already has ${count} document(s); skipping seed.`);
    await client.close();
    return;
  }

  const now = new Date();
  const docs = [
    {
      title: "Renew passport",
      category: "passport_id",
      dueDate: addDays(45),
      notes: "10-year renewal, apply online at least 6 weeks ahead.",
      recurring: true,
      recurrence: { interval: 10, unit: "years" },
      reminderOffsets: [30, 7, 1],
      status: "active",
      lastConfirmedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Car insurance renewal",
      category: "insurance",
      dueDate: addDays(12),
      notes: "Compare quotes before auto-renewing.",
      recurring: true,
      recurrence: { interval: 1, unit: "years" },
      reminderOffsets: [30, 7, 1],
      status: "active",
      lastConfirmedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Property tax installment",
      category: "bills_fees",
      dueDate: addDays(3),
      notes: "",
      recurring: false,
      recurrence: null,
      reminderOffsets: [7, 1],
      status: "active",
      lastConfirmedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Car oil change",
      category: "vehicle",
      dueDate: addDays(-2),
      notes: "Due every 8,000 km or 6 months, whichever first.",
      recurring: true,
      recurrence: { interval: 6, unit: "months" },
      reminderOffsets: [7, 1],
      status: "active",
      lastConfirmedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Antivirus subscription renewal",
      category: "software_security",
      dueDate: addDays(20),
      notes: "",
      recurring: true,
      recurrence: { interval: 1, unit: "years" },
      reminderOffsets: [30, 7, 1],
      status: "active",
      lastConfirmedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "HVAC filter replacement",
      category: "home_maintenance",
      dueDate: addDays(60),
      notes: "",
      recurring: true,
      recurrence: { interval: 3, unit: "months" },
      reminderOffsets: [7],
      status: "active",
      lastConfirmedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await col.insertMany(docs);
  console.log(`Inserted ${docs.length} example obligations.`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
