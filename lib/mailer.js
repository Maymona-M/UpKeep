import nodemailer from "nodemailer";

let transporter = null;

function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

const KIND_LABELS = {
  due_today: "is due today",
  overdue_daily: "is overdue",
};

function kindSubjectLabel(kind) {
  if (KIND_LABELS[kind]) return KIND_LABELS[kind];
  const match = /^offset_(\d+)$/.exec(kind);
  if (match) return `is due in ${match[1]} day${match[1] === "1" ? "" : "s"}`;
  return "needs attention";
}

// Returns { sent: boolean, reason?: string } so callers can log outcomes
// without throwing and breaking the whole cron run over one bad address.
export async function sendReminderEmail({ to, obligation, kind }) {
  const t = getTransporter();
  if (!t) {
    return { sent: false, reason: "Email not configured (SMTP_HOST/USER/PASS missing)." };
  }
  const label = kindSubjectLabel(kind);
  const subject = `UpKeep: "${obligation.title}" ${label}`;
  const text = [
    `${obligation.title} ${label}.`,
    `Due date: ${obligation.dueDate}`,
    obligation.notes ? `Notes: ${obligation.notes}` : null,
    "",
    "This is an automated reminder from UpKeep.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}

export { isEmailConfigured };
