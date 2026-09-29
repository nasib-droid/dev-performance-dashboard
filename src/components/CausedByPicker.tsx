"use client";

import { useState } from "react";
import { setCausedBy } from "@/lib/actions";

type Option = { id: number; name: string; assignee: string; deliveredAt: string };

// Date included so two tasks with the same title (real cases exist on this board) don't collide.
function labelFor(o: Option) {
  return `${o.assignee}: ${o.name} · ${o.deliveredAt}`;
}

export function CausedByPicker({
  taskId,
  causedByTaskId,
  options,
}: {
  taskId: number;
  causedByTaskId: number | null;
  options: Option[];
}) {
  const choices = options.filter((o) => o.id !== taskId);
  const byLabel = new Map(choices.map((o) => [labelFor(o), o.id]));
  const current = choices.find((o) => o.id === causedByTaskId);
  const [value, setValue] = useState(current ? labelFor(current) : "");
  const listId = `cause-options-${taskId}`;

  return (
    <>
      <input
        type="text"
        list={listId}
        className="input input-search"
        placeholder="Search tasks…"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          if (v === "") {
            setCausedBy(taskId, null);
          } else {
            const id = byLabel.get(v);
            if (id) setCausedBy(taskId, id);
          }
        }}
        style={{ height: "var(--input-height-sm)", fontSize: "var(--font-size-xs)", width: 240 }}
      />
      <datalist id={listId}>
        {choices.map((o) => (
          <option key={o.id} value={labelFor(o)} />
        ))}
      </datalist>
    </>
  );
}
