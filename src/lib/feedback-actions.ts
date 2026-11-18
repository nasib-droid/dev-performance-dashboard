"use server";

import { feedbackAlertText, notifyGoogleChat } from "@/lib/chat";
import { MAX_COMMENT, MAX_NAME, displayTaskName, type FeedbackResult } from "@/lib/feedback";
import { verifyFeedbackLink } from "@/lib/session";
import { addCardComment, fetchFeedbackCard } from "@/lib/trello";

// Public: anyone holding a signed feedback link can call this, without logging in.
// The link signature is the only thing that authorises it, so it's checked on every call.

export async function submitFeedback(cardId: string, sig: string, name: string, comment: string): Promise<FeedbackResult> {
  if (typeof cardId !== "string" || typeof sig !== "string" || !(await verifyFeedbackLink(cardId, sig))) {
    return { ok: false, error: "This feedback link isn't valid." };
  }

  const cleanName = String(name ?? "").replace(/\s+/g, " ").trim();
  const cleanComment = String(comment ?? "").trim();
  if (!cleanName || cleanName.length > MAX_NAME) return { ok: false, error: `Please enter your name (up to ${MAX_NAME} characters).` };
  if (!cleanComment) return { ok: false, error: "Please write your feedback." };
  if (cleanComment.length > MAX_COMMENT) return { ok: false, error: `Feedback can be up to ${MAX_COMMENT} characters.` };

  const safeName = cleanName.replace(/[*_`<>|]/g, "");
  let card: Awaited<ReturnType<typeof fetchFeedbackCard>>;
  try {
    card = await fetchFeedbackCard(cardId);
    if (!card) return { ok: false, error: "This task has been archived on Trello, so feedback is closed." };
    await addCardComment(cardId, `**Feedback from ${safeName}**\n\n${cleanComment}`);
  } catch {
    return { ok: false, error: "Couldn't reach Trello. Please try again in a minute." };
  }

  await notifyGoogleChat(feedbackAlertText(displayTaskName(card.name), safeName, cleanComment, card.shortUrl));
  return { ok: true };
}
