"use client";

import { setAssigneeTarget } from "@/lib/actions";

type Row = { assignee: string; points: number; target: number | null };

function TargetRow({ assignee, points, target }: Row) {
  const met = target != null && points >= target;
  return (
    <div className="flex items-center justify-between" style={{ padding: ".625rem 0" }}>
      <span style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--weight-medium)", color: "var(--sand-70)" }}>
        {assignee}
      </span>
      <div className="flex items-center gap-2">
        <span className={`pill ${target == null ? "pill-default" : met ? "pill-green" : "pill-orange"}`}>
          {points} pts
        </span>
        <span className="body-small">/</span>
        <input
          type="number"
          min={0}
          defaultValue={target ?? ""}
          placeholder="target"
          className="input"
          style={{ width: 90, height: "var(--input-height-sm)", fontSize: "var(--font-size-xs)" }}
          onBlur={(e) => {
            const value = Number(e.target.value);
            if (e.target.value !== "" && !Number.isNaN(value)) setAssigneeTarget(assignee, value);
          }}
        />
      </div>
    </div>
  );
}

export function IndividualTargets({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="body-small">No assignees yet.</p>;
  }
  return (
    <div>
      {rows.map((row, i) => (
        <div key={row.assignee} style={i < rows.length - 1 ? { borderBottom: "1px solid var(--sand-20)" } : undefined}>
          <TargetRow {...row} />
        </div>
      ))}
    </div>
  );
}
