import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { todayStr, reminderKindsDueToday } from "@/lib/dates";
import { sendReminderEmail, isEmailConfigured } from "@/lib/mailer";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return header === `Bearer ${secret}` || querySecret === secret;
}

// GET /api/cron/reminders
// Runs once a day for every household, not just one. Each user's
// obligations are checked against that same user's own notification list.
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const today = todayStr();
  const [usersCol, obligationsCol, logsCol] = await Promise.all([
    getCollection("users"),
    getCollection("obligations"),
    getCollection("reminderLogs"),
  ]);

  const users = await usersCol.find({}).toArray();

  const summary = {
    date: today,
    householdsChecked: users.length,
    emailConfigured: isEmailConfigured(),
    remindersFound: 0,
    emailsSent: 0,
    emailsFailed: 0,
    details: [],
  };

  for (const user of users) {
    const ownerId = user._id.toString();
    const recipients = user.notificationEmails || [];
    const obligations = await obligationsCol.find({ ownerId, status: { $ne: "done" } }).toArray();

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
          ownerId,
          title: obligation.title,
          kind,
          date: today,
          sentAt: new Date(),
          emailResults,
        });

        summary.details.push({ owner: user.email, obligation: obligation.title, kind, emailResults });
      }
    }
  }

  return NextResponse.json(summary);
}
