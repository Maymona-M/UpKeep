import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getSettings } from "@/lib/settings";
import { todayStr, reminderKindsDueToday } from "@/lib/dates";
import { sendReminderEmail, isEmailConfigured } from "@/lib/mailer";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never run unprotected
  const header = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return header === `Bearer ${secret}` || querySecret === secret;
}

// GET /api/cron/reminders
// Intended to be called once a day (e.g. by Vercel Cron, see vercel.json).
// Idempotent: running it twice in the same day will not double-send,
// because each (obligation, reminder kind, day) combination is logged
// before/at send time.
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const today = todayStr();
  const [obligationsCol, logsCol, settings] = await Promise.all([
    getCollection("obligations"),
    getCollection("reminderLogs"),
    getSettings(),
  ]);

  const obligations = await obligationsCol.find({ status: { $ne: "done" } }).toArray();
  const recipients = settings.notificationEmails || [];

  const summary = {
    date: today,
    checked: obligations.length,
    emailConfigured: isEmailConfigured(),
    recipients: recipients.length,
    remindersFound: 0,
    emailsSent: 0,
    emailsFailed: 0,
    details: [],
  };

  for (const obligation of obligations) {
    const existingLogs = await logsCol
      .find({ obligationId: obligation._id.toString(), date: today })
      .toArray();
    const sentKindsToday = new Set(existingLogs.map((l) => l.kind));

    const kinds = reminderKindsDueToday(obligation, sentKindsToday, today);
    if (kinds.length === 0) continue;

    for (const kind of kinds) {
      summary.remindersFound += 1;
      const emailResults = [];

      for (const to of recipients) {
        const result = await sendReminderEmail({ to, obligation, kind });
        emailResults.push({ to, ...result });
        if (result.sent) summary.emailsSent += 1;
        else summary.emailsFailed += 1;
      }

      await logsCol.insertOne({
        obligationId: obligation._id.toString(),
        title: obligation.title,
        kind,
        date: today,
        sentAt: new Date(),
        emailResults,
      });

      summary.details.push({ obligation: obligation.title, kind, emailResults });
    }
  }

  return NextResponse.json(summary);
}
