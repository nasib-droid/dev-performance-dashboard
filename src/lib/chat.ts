// Private feedback alerts via a Google Chat incoming webhook. Optional: with no
// GOOGLE_CHAT_WEBHOOK_URL set, nothing is sent. Kept import-free so `npm run check` can test it.

const MAX_PREVIEW = 500;

// Chat markup: *bold*, <url|label>. Feedback text is shown as typed, trimmed to a preview.
export function feedbackAlertText(task: string, name: string, comment: string, cardUrl: string) {
  const preview = comment.length > MAX_PREVIEW ? `${comment.slice(0, MAX_PREVIEW)}…` : comment;
  return `*New QA feedback* on *${task}*\nFrom ${name}:\n${preview}\n<${cardUrl}|Open the card in Trello>`;
}

// Best effort: a failed or slow alert must never fail the feedback itself, which is already on Trello.
export async function notifyGoogleChat(text: string, webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL) {
  if (!webhookUrl) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
