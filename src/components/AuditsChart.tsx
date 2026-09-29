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
import { AUDIT_MAJOR_TARGET, AUDIT_MINOR_TARGET } from "@/lib/targets";
import { linkAuditTask, unlinkAuditTask } from "@/lib/actions";

type AuditPoint = { id: number; date: string; major: number; minor: number; notes: string | null };
type Link = { linkId: number; auditId: number; taskId: number; taskName: string; taskAssignee: string };
type TaskOption = { id: number; name: string; assignee: string; deliveredAt: string };

function labelFor(o: TaskOption) {
  return `${o.assignee}: ${o.name} · ${o.deliveredAt}`;
}

export function AuditsChart({
  data,
  links,
  taskOptions,
}: {
  data: AuditPoint[];
  links: Link[];
  taskOptions: TaskOption[];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const selected = data.find((a) => a.id === selectedId) ?? null;
  const linkedTasks = selected ? links.filter((l) => l.auditId === selected.id) : [];
  const linkedTaskIds = new Set(linkedTasks.map((l) => l.taskId));
  const byLabel = new Map(taskOptions.filter((o) => !linkedTaskIds.has(o.id)).map((o) => [labelFor(o), o.id]));

  function close() {
    setSelectedId(null);
    setQuery("");
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ebebea" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#77736e" }} />
          <YAxis tick={{ fontSize: 12, fill: "#77736e" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #ebebea",
              borderRadius: 12,
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: "#585450" }} />
          <Bar
            dataKey="major"
            fill="#dc2626"
            name="Major"
            cursor="pointer"
            onClick={(point: { payload?: { id?: number } }) => {
              if (point?.payload?.id) setSelectedId(point.payload.id);
            }}
          />
          <Bar
            dataKey="minor"
            fill="#f97316"
            name="Minor"
            cursor="pointer"
            onClick={(point: { payload?: { id?: number } }) => {
              if (point?.payload?.id) setSelectedId(point.payload.id);
            }}
          />
          <ReferenceLine
            y={AUDIT_MAJOR_TARGET}
            stroke="#dc2626"
            strokeDasharray="4 4"
            label={{ value: `≤${AUDIT_MAJOR_TARGET} major`, fontSize: 11, fill: "#dc2626", position: "insideTopLeft" }}
          />
          <ReferenceLine
            y={AUDIT_MINOR_TARGET}
            stroke="#ea580c"
            strokeDasharray="4 4"
            label={{ value: `≤${AUDIT_MINOR_TARGET} minor`, fontSize: 11, fill: "#ea580c", position: "insideBottomLeft" }}
          />
        </BarChart>
      </ResponsiveContainer>

      {selected && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Audit — {selected.date}</div>
                <div className="modal-subtitle">
                  {selected.major} major · {selected.minor} minor
                  {selected.notes ? ` · ${selected.notes}` : ""}
                </div>
              </div>
              <button className="modal-close" onClick={close}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="input-label mb-2" style={{ fontSize: "var(--font-size-sm)" }}>
                Tasks where this was found
              </p>
              {linkedTasks.length === 0 ? (
                <p className="body-small mb-4">No tasks linked yet.</p>
              ) : (
                <div className="table-container mb-4">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Card</th>
                        <th>Assignee</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedTasks.map((l) => (
                        <tr key={l.linkId}>
                          <td style={{ color: "var(--sand-80)", fontWeight: "var(--weight-medium)" }}>{l.taskName}</td>
                          <td>{l.taskAssignee}</td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => unlinkAuditTask(l.linkId)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <input
                type="text"
                list={`audit-task-options-${selected.id}`}
                className="input input-search"
                placeholder="Search tasks to link…"
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  const id = byLabel.get(v);
                  if (id) {
                    linkAuditTask(selected.id, id);
                    setQuery("");
                  } else {
                    setQuery(v);
                  }
                }}
              />
              <datalist id={`audit-task-options-${selected.id}`}>
                {[...byLabel.keys()].map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
