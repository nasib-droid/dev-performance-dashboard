"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { WEEKLY_POINT_TARGET } from "@/lib/targets";

// Luma data-series colours: Ocean, Evergreen, Ember, then Sand tones for any additional assignees.
const COLORS = ["#2563eb", "#10b981", "#f97316", "#77736e", "#dc2626"];

type Task = { id: number; name: string; assignee: string; points: number | null; deliveredAt: string; week: string };

export function VolumeChart({
  data,
  assignees,
  tasks,
}: {
  data: Record<string, string | number>[];
  assignees: string[];
  tasks: Task[];
}) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const matches = selectedWeek ? tasks.filter((t) => t.week === selectedWeek) : [];
  const counts = new Map<string, { count: number; points: number }>();
  for (const t of matches) {
    const c = counts.get(t.assignee) ?? { count: 0, points: 0 };
    c.count += 1;
    c.points += t.points ?? 0;
    counts.set(t.assignee, c);
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ebebea" />
          <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#77736e" }} />
          <YAxis tick={{ fontSize: 12, fill: "#77736e" }} />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #ebebea",
              borderRadius: 12,
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: "#585450" }} />
          {assignees.map((name, i) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="pts"
              fill={COLORS[i % COLORS.length]}
              radius={[0, 0, 0, 0]}
              cursor="pointer"
              onClick={(point: { payload?: { week?: string } }) => {
                const week = point?.payload?.week;
                if (week) setSelectedWeek(week);
              }}
            />
          ))}
          <ReferenceLine
            y={WEEKLY_POINT_TARGET}
            stroke="#dc2626"
            strokeDasharray="4 4"
            label={{ value: `Target ${WEEKLY_POINT_TARGET}/wk`, fontSize: 12, fill: "#dc2626", position: "right" }}
          />
        </BarChart>
      </ResponsiveContainer>

      {selectedWeek && (
        <div className="modal-backdrop" onClick={() => setSelectedWeek(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Week of {selectedWeek}</div>
                <div className="modal-subtitle">All tasks delivered that week</div>
              </div>
              <button className="modal-close" onClick={() => setSelectedWeek(null)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {matches.length === 0 ? (
                <p className="body-small">No tasks found.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[...counts.entries()].map(([assignee, c]) => (
                      <span key={assignee} className="pill pill-default">
                        {assignee}: {c.count} {c.count === 1 ? "task" : "tasks"} ({c.points} pts)
                      </span>
                    ))}
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Card</th>
                          <th>Assignee</th>
                          <th>Points</th>
                          <th>Delivered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matches.map((t) => (
                          <tr key={t.id}>
                            <td style={{ color: "var(--sand-80)", fontWeight: "var(--weight-medium)" }}>{t.name}</td>
                            <td>{t.assignee}</td>
                            <td>{t.points ?? "—"}</td>
                            <td>{t.deliveredAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
