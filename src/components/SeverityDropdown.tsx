"use client";

import { setSeverity } from "@/lib/actions";

export function SeverityDropdown({ taskId }: { taskId: number }) {
  return (
    <div className="select-wrap" style={{ width: "auto" }}>
      <select
        defaultValue=""
        onChange={(e) => {
          const value = e.target.value as "High" | "Medium" | "Low";
          if (value) setSeverity(taskId, value);
        }}
        className="input"
      >
        <option value="" disabled>
          Set severity…
        </option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>
    </div>
  );
}
