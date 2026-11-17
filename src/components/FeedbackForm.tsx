"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitFeedback } from "@/lib/feedback-actions";
import { MAX_COMMENT, MAX_NAME, QUICK_REPLIES } from "@/lib/feedback";

const NAME_KEY = "feedback-name";

export function FeedbackForm({ cardId, sig }: { cardId: string; sig: string }) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const commentRef = useRef<HTMLTextAreaElement>(null);

  // Replaces the box if it's empty or still holds another quick reply; otherwise adds to what they wrote.
  function applyQuickReply(reply: string) {
    const current = comment.trim();
    const next = !current || QUICK_REPLIES.includes(current) ? reply : `${current}\n${reply}`;
    const withSpace = reply.endsWith(":") ? `${next} ` : next;
    setComment(withSpace);
    requestAnimationFrame(() => {
      const box = commentRef.current;
      if (!box) return;
      box.focus();
      box.setSelectionRange(withSpace.length, withSpace.length);
    });
  }

  // Remember the reviewer's name between tasks, so they don't retype it for each link.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of browser storage after mount
      if (saved) setName(saved);
    } catch {}
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitFeedback(cardId, sig, name, comment);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {}
      setComment("");
      setSentCount((n) => n + 1);
    });
  }

  return (
    <form onSubmit={submit}>
      {sentCount > 0 && (
        <div className="pill pill-green mb-4" style={{ whiteSpace: "normal" }}>
          Thanks, your feedback was added.
        </div>
      )}
      <div className="input-group mb-4">
        <label className="input-label" htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          className="input"
          value={name}
          maxLength={MAX_NAME}
          required
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="input-group mb-5">
        <label className="input-label" htmlFor="comment">
          Feedback
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick replies">
          {QUICK_REPLIES.map((reply) => {
            const active = comment.trim() === reply;
            return (
              <button
                key={reply}
                type="button"
                className={`pill ${active ? "pill-blue" : "pill-default"}`}
                style={{ cursor: "pointer" }}
                aria-pressed={active}
                onClick={() => applyQuickReply(reply)}
              >
                {reply.replace(/:$/, "…")}
              </button>
            );
          })}
        </div>
        <textarea
          id="comment"
          ref={commentRef}
          placeholder="Or write your own…"
          className="input"
          rows={4}
          value={comment}
          maxLength={MAX_COMMENT}
          required
          onChange={(e) => setComment(e.target.value)}
        />
        {error && <span className="input-error-msg">{error}</span>}
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
