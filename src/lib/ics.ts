/**
 * Generate an .ics file (RFC 5545) for a daily recurring reminder.
 * The user imports it into their phone's Calendar app — once.
 * The OS then handles native notifications forever, with no backend.
 */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** YYYYMMDDTHHMMSS in local time (no Z). */
function localStamp(d: Date) {
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/** UTC stamp ending in Z, used for DTSTAMP. */
function utcStamp(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export interface DailyReminderInput {
  /** "HH:mm" 24-hour, e.g. "21:00" */
  time: string;
  title?: string;
  description?: string;
  /** IANA timezone, e.g. "Asia/Kolkata". Defaults to user's local. */
  tz?: string;
  /** App URL to deep-link from the event. */
  url?: string;
}

export function buildDailyReminderIcs(input: DailyReminderInput): string {
  const {
    time,
    title = "Log today's expenses on Duddify",
    description = "Tap to open Duddify and log what you spent today. Future you will thank you.",
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    url,
  } = input;

  const [hh, mm] = time.split(":").map((s) => parseInt(s, 10));
  if (isNaN(hh) || isNaN(mm)) throw new Error("invalid time");

  // Start tomorrow if today's time has already passed; else today.
  const now = new Date();
  const start = new Date();
  start.setHours(hh, mm, 0, 0);
  if (start.getTime() <= now.getTime() + 60_000) {
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(start.getTime() + 15 * 60_000); // 15-min event

  const uid = `duddify-daily-${start.getTime()}@duddify.app`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Duddify//Daily Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(description)}`,
    url ? `URL:${escape(url)}` : "",
    `DTSTART;TZID=${tz}:${localStamp(start)}`,
    `DTEND;TZID=${tz}:${localStamp(end)}`,
    "RRULE:FREQ=DAILY;INTERVAL=1",
    // Two alarms: one at the event start, one 15 min before
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].filter(Boolean);

  return lines.join("\r\n");
}

function escape(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
