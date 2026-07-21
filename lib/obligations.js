import { CATEGORY_KEYS } from "@/lib/categories";
import { dueStatus, daysBetween } from "@/lib/dates";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RECURRENCE_UNITS = ["days", "weeks", "months", "years"];

export class ValidationError extends Error {
  constructor(message, fields) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields || {};
  }
}

// Validates a create/update payload. Returns a cleaned object containing
// only known, well-typed fields. Throws ValidationError with field-level
// messages on bad input, never lets bad data reach the database silently.
export function validateObligationInput(body, { partial = false } = {}) {
  const fields = {};
  const out = {};

  const required = (key) => !partial && (body[key] === undefined || body[key] === null || body[key] === "");

  if (required("title")) fields.title = "Title is required.";
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      fields.title = "Title must be a non-empty string.";
    } else if (body.title.length > 200) {
      fields.title = "Title must be under 200 characters.";
    } else {
      out.title = body.title.trim();
    }
  }

  if (required("category")) fields.category = "Category is required.";
  if (body.category !== undefined) {
    if (!CATEGORY_KEYS.includes(body.category)) {
      fields.category = `Category must be one of: ${CATEGORY_KEYS.join(", ")}.`;
    } else {
      out.category = body.category;
    }
  }

  if (required("dueDate")) fields.dueDate = "Due date is required.";
  if (body.dueDate !== undefined) {
    if (typeof body.dueDate !== "string" || !DATE_RE.test(body.dueDate)) {
      fields.dueDate = "Due date must be in YYYY-MM-DD format.";
    } else {
      out.dueDate = body.dueDate;
    }
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== "string" || body.notes.length > 2000) {
      fields.notes = "Notes must be text under 2000 characters.";
    } else {
      out.notes = body.notes.trim();
    }
  }

  if (body.recurring !== undefined) {
    if (typeof body.recurring !== "boolean") {
      fields.recurring = "Recurring must be true or false.";
    } else {
      out.recurring = body.recurring;
    }
  }

  if (out.recurring || body.recurring) {
    const recurrence = body.recurrence || {};
    const interval = Number(recurrence.interval);
    if (!Number.isInteger(interval) || interval < 1) {
      fields.recurrence = "Recurrence interval must be a whole number of 1 or more.";
    } else if (!RECURRENCE_UNITS.includes(recurrence.unit)) {
      fields.recurrence = `Recurrence unit must be one of: ${RECURRENCE_UNITS.join(", ")}.`;
    } else {
      out.recurrence = { interval, unit: recurrence.unit };
    }
  } else if (body.recurring === false) {
    out.recurrence = null;
  }

  if (body.reminderOffsets !== undefined) {
    if (
      !Array.isArray(body.reminderOffsets) ||
      !body.reminderOffsets.every((n) => Number.isInteger(n) && n > 0)
    ) {
      fields.reminderOffsets = "Reminder offsets must be a list of positive whole numbers (days before).";
    } else {
      out.reminderOffsets = [...new Set(body.reminderOffsets)].sort((a, b) => b - a);
    }
  }

  if (body.status !== undefined) {
    if (!["active", "done"].includes(body.status)) {
      fields.status = "Status must be active or done.";
    } else {
      out.status = body.status;
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError("Please fix the highlighted fields.", fields);
  }

  return out;
}

export function serializeObligation(doc, today) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    category: doc.category,
    dueDate: doc.dueDate,
    notes: doc.notes || "",
    recurring: Boolean(doc.recurring),
    recurrence: doc.recurrence || null,
    reminderOffsets: doc.reminderOffsets || null,
    status: doc.status || "active",
    computedStatus: doc.status === "done" ? "done" : dueStatus(doc.dueDate, today),
    daysDiff: daysBetween(today, doc.dueDate),
    lastConfirmedAt: doc.lastConfirmedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// Stripped-down view for the read-only family link: no notes (may contain
// context the admin wrote for themselves) beyond what's needed to act,
// actually notes ARE useful for family ("renew at the DMV on Elm St") so we
// keep them, but nothing else is ever exposed beyond this shape.
export function serializePublicObligation(doc, today) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    category: doc.category,
    dueDate: doc.dueDate,
    notes: doc.notes || "",
    status: doc.status || "active",
    computedStatus: doc.status === "done" ? "done" : dueStatus(doc.dueDate, today),
    daysDiff: daysBetween(today, doc.dueDate),
  };
}
