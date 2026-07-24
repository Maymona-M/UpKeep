import crypto from "crypto";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { getCollection } from "@/lib/mongodb";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let indexesEnsured = false;

async function usersCollection() {
  const col = await getCollection("users");
  if (!indexesEnsured) {
    // Idempotent - safe to call on every cold start. Guarantees two people
    // can't sign up with the same email even under concurrent requests.
    await col.createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await col.createIndex({ viewToken: 1 }, { unique: true }).catch(() => {});
    indexesEnsured = true;
  }
  return col;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    email: user.email,
    householdName: user.householdName || "",
    viewToken: user.viewToken,
    notificationEmails: user.notificationEmails || [],
  };
}

export class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function createUser({ email, password, householdName }) {
  const cleanEmail = normalizeEmail(email);
  if (!EMAIL_RE.test(cleanEmail)) {
    throw new AuthError("Enter a valid email address.", 422);
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.", 422);
  }

  const col = await usersCollection();
  const existing = await col.findOne({ email: cleanEmail });
  if (existing) {
    throw new AuthError("An account with that email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const doc = {
    email: cleanEmail,
    passwordHash,
    householdName: householdName?.trim() || "",
    viewToken: crypto.randomBytes(24).toString("hex"),
    notificationEmails: [cleanEmail],
    resetTokenHash: null,
    resetTokenExpires: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  } catch (err) {
    if (err.code === 11000) {
      throw new AuthError("An account with that email already exists.", 409);
    }
    throw err;
  }
}

export async function findUserByEmail(email) {
  const col = await usersCollection();
  return col.findOne({ email: normalizeEmail(email) });
}

export async function findUserById(id) {
  let _id;
  try {
    _id = typeof id === "string" ? new ObjectId(id) : id;
  } catch {
    return null;
  }
  const col = await usersCollection();
  return col.findOne({ _id });
}

export async function findUserByViewToken(token) {
  if (!token) return null;
  const col = await usersCollection();
  return col.findOne({ viewToken: token });
}

export async function verifyPassword(user, password) {
  if (!user?.passwordHash || typeof password !== "string") return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function updatePassword(userId, newPassword) {
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    throw new AuthError("Password must be at least 8 characters.", 422);
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const col = await usersCollection();
  await col.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { passwordHash, updatedAt: new Date() }, $unset: { resetTokenHash: "", resetTokenExpires: "" } }
  );
}

export async function updateNotificationEmails(userId, emails) {
  const emailRe = EMAIL_RE;
  const clean = emails.map((e) => e.trim()).filter(Boolean);
  const invalid = clean.filter((e) => !emailRe.test(e));
  if (invalid.length > 0) {
    throw new AuthError(`These don't look like valid email addresses: ${invalid.join(", ")}`, 422);
  }
  const col = await usersCollection();
  await col.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { notificationEmails: clean, updatedAt: new Date() } }
  );
}

export async function regenerateViewToken(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  const col = await usersCollection();
  await col.updateOne({ _id: new ObjectId(userId) }, { $set: { viewToken: token, updatedAt: new Date() } });
  return token;
}

// Generates a reset token, stores only its hash (so a database read alone
// can't be used to reset someone's password), and returns the raw token to
// be emailed (never stored, never returned over the API to avoid leaking
// account-takeover capability to whoever requested the reset).
export async function createPasswordResetToken(email) {
  const user = await findUserByEmail(email);
  if (!user) return null; // caller responds identically either way - no user enumeration

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const col = await usersCollection();
  await col.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: tokenHash, resetTokenExpires: expires, updatedAt: new Date() } }
  );

  return rawToken;
}

export async function resetPasswordWithToken(rawToken, newPassword) {
  if (typeof rawToken !== "string" || !rawToken) {
    throw new AuthError("Reset link is invalid or has expired.", 400);
  }
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const col = await usersCollection();
  const user = await col.findOne({ resetTokenHash: tokenHash });

  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    throw new AuthError("Reset link is invalid or has expired.", 400);
  }

  await updatePassword(user._id, newPassword);
  return user;
}
