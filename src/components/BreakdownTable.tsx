"use client";

import { useState } from "react";

type Column = { key: string; label: string; hint?: string; pill: string };
type Task = { id: number; name: string; assignee: string; points: number | null; deliveredAt: string; segment: string };
type Selection = { developer: string | null; segment: string | null };

const TEAM = "Team";

export function BreakdownTable({
  columns,
  developers,
  tasks,
  noun,
  segmentLabel,
}: {
  columns: Column[];
  developers: string[];
  tasks: Task[];
  noun: string;
  segmentLabel: string;
}) {
  const [selected, setSelected] = useState<Selection | null>(null);

  if (developers.length === 0) {
    return <p className="body-small">Nothing delivered in this period.</p>;
  }

  const matching = ({ developer, segment }: Selection) =>
    tasks.filter((t) => (developer === null || t.assignee === developer) && (segment === null || t.segment === segment));

  const pillFor = (segment: string) => columns.find((c) => c.key === segment)?.pill ?? "pill-default";
  const labelFor = (segment: string) => columns.find((c) => c.key === segment)?.label ?? segment;

  const cell = (developer: string | null, segment: string | null) => {
    const n = matching({ developer, segment }).length;
    const totalStyle = { background: "none", border: "none", padding: 0, color: "var(--sand-80)", fontWeight: "var(--weight-bold)" };
    return (
      <button
        type="button"
        className={segment ? `pill pill-sm ${n > 0 ? pillFor(segment) : "pill-default"}` : undefined}
        disabled={n === 0}
        onClick={() => setSelected({ developer, segment })}
        style={{ cursor: n > 0 ? "pointer" : "default", ...(segment ? {} : totalStyle) }}
        title={n > 0 ? `Show ${n} ${noun}` : undefined}
      >
        {n}
      </button>
    );
  };

  const renderRow = (name: string) => {
    const developer = name === TEAM ? null : name;
    const isTeam = developer === null;
    return (
      <tr key={name} style={isTeam ? { background: "var(--sand-10)" } : undefined}>
        <td style={{ color: "var(--sand-80)", fontWeight: isTeam ? "var(--weight-bold)" : "var(--weight-medium)" }}>{name}</td>
        {columns.map((c) => (
          <td key={c.key}>{cell(developer, c.key)}</td>
        ))}
        <td>{cell(developer, null)}</td>
      </tr>
    );
  };

  const rows = selected ? matching(selected) : [];
  const title = selected
    ? `${selected.developer ?? TEAM}: ${selected.segment ? labelFor(selected.segment) : "All"} ${noun}`
    : "";

  return (
    <>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Developer</th>
              {columns.map((c) => (
                <th key={c.key}>
                  {c.label}
                  {c.hint && (
                    <span style={{ fontWeight: "var(--weight-regular)", textTransform: "none", letterSpacing: 0 }}> · {c.hint}</span>
                  )}
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {developers.map(renderRow)}
            {developers.length > 1 && renderRow(TEAM)}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{title}</div>
                <div className="modal-subtitle">
                  {rows.length} {rows.length === 1 ? noun.replace(/s$/, "") : noun} delivered in the selected period
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th>Developer</th>
                      <th>{segmentLabel}</th>
                      <th>Points</th>
                      <th>Delivered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows]
                      .sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt))
                      .map((t) => (
                        <tr key={t.id}>
                          <td style={{ color: "var(--sand-80)", fontWeight: "var(--weight-medium)" }}>{t.name}</td>
                          <td>{t.assignee}</td>
                          <td>
                            <span className={`pill pill-sm ${pillFor(t.segment)}`}>{labelFor(t.segment)}</span>
                          </td>
                          <td>{t.points ?? "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{t.deliveredAt}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
