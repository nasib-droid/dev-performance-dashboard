"use client";

import { setDeliveredAt } from "@/lib/actions";

export function DeliveredDateEditor({ taskId, deliveredAt }: { taskId: number; deliveredAt: string }) {
  return (
    <input
      type="date"
      defaultValue={deliveredAt}
      onChange={(e) => {
        if (e.target.value) setDeliveredAt(taskId, e.target.value);
      }}
      className="input"
      style={{ height: "var(--input-height-sm)", fontSize: "var(--font-size-xs)", padding: ".25rem .5rem", width: "auto" }}
    />
  );
}
