import crypto from "crypto";
import { getCollection } from "@/lib/mongodb";

const SETTINGS_ID = "singleton";

function defaultsFromEnv() {
  return {
    _id: SETTINGS_ID,
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || null,
    viewToken: process.env.VIEW_TOKEN || crypto.randomBytes(24).toString("hex"),
    notificationEmails: (process.env.NOTIFICATION_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Fetches the one settings doc, creating it from env defaults the first
// time the app runs against a fresh database.
export async function getSettings() {
  const col = await getCollection("settings");
  let doc = await col.findOne({ _id: SETTINGS_ID });
  if (!doc) {
    doc = defaultsFromEnv();
    await col.insertOne(doc);
  }
  return doc;
}

export async function updateSettings(patch) {
  const col = await getCollection("settings");
  await col.updateOne(
    { _id: SETTINGS_ID },
    { $set: { ...patch, updatedAt: new Date() } },
    { upsert: true }
  );
  return getSettings();
}

export async function regenerateViewToken() {
  const token = crypto.randomBytes(24).toString("hex");
  await updateSettings({ viewToken: token });
  return token;
}
