// Usage: node scripts/add-test-data.js "email@example.com"
// Adds ~20 varied obligations spanning every category, status, and due-date
// range (overdue, due today, due this week, upcoming, far out) to the
// given user's household, so you can exercise search, filter, and sort.
// Always inserts (doesn't skip on existing data) - safe to run more than
// once if you want more volume.
require("dotenv").config();
const { MongoClient } = require("mongodb");

function addDays(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/add-test-data.js "email@example.com"');
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

  const user = await db.collection("users").findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    console.error(`No account found for ${email}. Create it first with scripts/create-account.js.`);
    await client.close();
    process.exit(1);
  }
  const ownerId = user._id.toString();

  const col = db.collection("obligations");
  const now = new Date();

  const base = (overrides) => ({
    ownerId,
    notes: "",
    recurring: false,
    recurrence: null,
    reminderOffsets: [30, 7, 1],
    status: "active",
    lastConfirmedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  const docs = [
    base({ title: "Renew driver's license", category: "passport_id", dueDate: addDays(-14) }),
    base({ title: "Qatar ID renewal", category: "passport_id", dueDate: addDays(-3), recurring: true, recurrence: { interval: 5, unit: "years" } }),
    base({ title: "Kid's passport renewal", category: "passport_id", dueDate: addDays(40) }),
    base({ title: "Health insurance renewal", category: "insurance", dueDate: addDays(-1), recurring: true, recurrence: { interval: 1, unit: "years" } }),
    base({ title: "Home insurance policy", category: "insurance", dueDate: addDays(18), recurring: true, recurrence: { interval: 1, unit: "years" } }),
    base({ title: "Travel insurance for trip", category: "insurance", dueDate: addDays(75) }),
    base({ title: "Electricity bill", category: "bills_fees", dueDate: addDays(0) }),
    base({ title: "Internet bill", category: "bills_fees", dueDate: addDays(5) }),
    base({ title: "Water bill", category: "bills_fees", dueDate: addDays(-7) }),
    base({ title: "Gym membership renewal", category: "bills_fees", dueDate: addDays(22), recurring: true, recurrence: { interval: 1, unit: "years" } }),
    base({ title: "Car registration renewal", category: "vehicle", dueDate: addDays(-2), recurring: true, recurrence: { interval: 1, unit: "years" } }),
    base({ title: "Tire rotation", category: "vehicle", dueDate: addDays(10), recurring: true, recurrence: { interval: 6, unit: "months" } }),
    base({ title: "Car insurance inspection", category: "vehicle", dueDate: addDays(31) }),
    base({ title: "AC servicing", category: "home_maintenance", dueDate: addDays(3), recurring: true, recurrence: { interval: 6, unit: "months" } }),
    base({ title: "Water heater flush", category: "home_maintenance", dueDate: addDays(-20) }),
    base({ title: "Smoke detector battery check", category: "home_maintenance", dueDate: addDays(90), recurring: true, recurrence: { interval: 1, unit: "years" } }),
    base({ title: "Pest control visit", category: "home_maintenance", dueDate: addDays(14) }),
    base({ title: "Antivirus license renewal", category: "software_security", dueDate: addDays(-5), recurring: true, recurrence: { interval: 1, unit: "years" } }),
    base({ title: "Password manager renewal", category: "software_security", dueDate: addDays(60), recurring: true, recurrence: { interval: 1, unit: "years" } }),
    base({ title: "Router firmware update check", category: "software_security", dueDate: addDays(7) }),
    base({ title: "Library membership renewal", category: "other", dueDate: addDays(45) }),
    base({ title: "Warranty claim deadline (laptop)", category: "other", dueDate: addDays(2) }),
  ];

  const result = await col.insertMany(docs);
  console.log(`Inserted ${result.insertedCount} test obligations for ${user.email}.`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
