import { KNOWN_ASSIGNEES } from "@/lib/targets";

export const MAX_NAME = 60;
export const MAX_COMMENT = 5000;

export type FeedbackResult = { ok: true } | { ok: false; error: string };

// One-click starters on the form, so a quick answer never feels like homework.
// Ones ending in ":" invite a few words after them.
export const QUICK_REPLIES = [
  "Works well",
  "Works well, and it saves me time",
  "Mostly works, one small issue:",
  "Not working as expected:",
];

// "Himal - Weekly Newsletter(1)" -> "Weekly Newsletter": reviewers don't need the developer or points.
export function displayTaskName(cardName: string) {
  const prefix = new RegExp(`^\\s*(${KNOWN_ASSIGNEES.join("|")})\\s+-\\s+`, "i");
  return cardName.replace(prefix, "").replace(/\s*\(\d+\)\s*$/, "").trim() || cardName;
}

// The message copied from the QA page, ready to paste into the team chat.
export function feedbackRequestMessage(cardName: string, link: string) {
  return [
    `Hi everyone, if you've seen or used "${displayTaskName(cardName)}", I'd appreciate it if you could click the link below and share your feedback.`,
    `A quick "works well" is perfect, and more detail is welcome if you have it. It takes less than a minute.`,
    link,
  ].join("\n\n");
}
