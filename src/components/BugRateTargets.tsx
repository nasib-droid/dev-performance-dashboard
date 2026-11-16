"use client";

import { setBugRateTarget } from "@/lib/actions";
import { formatRate } from "@/lib/stats";

type Row = { name: string; rate: number | null; target: number | null };

// Lower is better: a rate at or under the ceiling is green.
export function BugRateTargets({ rows, quarter }: { rows: Row[]; quarter: string }) {
  return (
    <div>
      {rows.map((r, i) => {
        const within = r.target != null && r.rate != null && r.rate <= r.target;
        const pill = r.target == null || r.rate == null ? "pill-default" : within ? "pill-green" : "pill-red";
        return (
          <div
            key={`${quarter}-${r.name}`}
            className="flex items-center justify-between"
            style={{ padding: ".625rem 0", ...(i < rows.length - 1 && { borderBottom: "1px solid var(--sand-20)" }) }}
          >
            <span style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--weight-medium)", color: "var(--sand-70)" }}>
              {r.name}
            </span>
            <div className="flex items-center justify-end gap-2">
              <span className={`pill ${pill}`}>{formatRate(r.rate)} per 100 pts</span>
              <span className="body-small">/ max</span>
              <input
                type="number"
                min={0}
                step={0.1}
                defaultValue={r.target ?? ""}
                placeholder="target"
                aria-label={`${r.name} bug target, bugs per 100 points`}
                className="input"
                style={{ width: 90, height: "var(--input-height-sm)", fontSize: "var(--font-size-xs)" }}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (e.target.value !== "" && value >= 0 && value <= 100 && value !== r.target) {
                    setBugRateTarget(r.name, quarter, value);
                  }
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
