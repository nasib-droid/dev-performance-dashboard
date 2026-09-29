"use client";

import { markNotABug } from "@/lib/actions";

export function NotABugButton({ taskId }: { taskId: number }) {
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={() => {
        if (confirm("Mark this task as not a bug? It will disappear from both bug tables.")) {
          markNotABug(taskId);
        }
      }}
    >
      Not a bug
    </button>
  );
}
