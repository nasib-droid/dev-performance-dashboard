"use client";

import { useState } from "react";
import { feedbackRequestMessage } from "@/lib/feedback";

// Copies a ready-to-send team chat message with the signed feedback link at the end.
export function CopyLinkButton({ path, cardName }: { path: string; cardName: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [message, setMessage] = useState("");

  async function copy() {
    const text = feedbackRequestMessage(cardName, `${window.location.origin}${path}`);
    setMessage(text);
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
    }
  }

  if (state === "failed") {
    // Clipboard blocked (e.g. non-HTTPS): show the message so it can be copied by hand.
    return (
      <textarea
        className="input"
        readOnly
        value={message}
        rows={4}
        onFocus={(e) => e.currentTarget.select()}
        style={{ fontSize: "var(--font-size-xs)", width: 300 }}
      />
    );
  }

  return (
    <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
      {state === "copied" ? "Message copied" : "Copy message + link"}
    </button>
  );
}
