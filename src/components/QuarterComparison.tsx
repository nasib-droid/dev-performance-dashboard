import { formatRate, type Summary } from "@/lib/stats";

type Line = { name: string; current: Summary; previous: Summary; target: number | null; previousTarget: number | null };

const METRICS: { key: keyof Summary; label: string; higherIsBetter: boolean; format?: (n: number | null) => string }[] = [
  { key: "points", label: "Points", higherIsBetter: true },
  { key: "tasks", label: "Tasks", higherIsBetter: true },
  { key: "major", label: "Major tasks", higherIsBetter: true },
  { key: "bugs", label: "Bugs", higherIsBetter: false },
  { key: "bugRate", label: "Bugs per 100 pts", higherIsBetter: false, format: formatRate },
];

function Change({ current, previous, higherIsBetter, format }: {
  current: number | null;
  previous: number | null;
  higherIsBetter: boolean;
  format: (n: number | null) => string;
}) {
  if (current == null || previous == null) return <div className="body-small">was {format(previous)}</div>;
  const diff = Number(format(current)) - Number(format(previous));
  const color = diff === 0 ? "var(--sand-50)" : diff > 0 === higherIsBetter ? "var(--evergreen-70)" : "var(--rust-60)";
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";
  return (
    <div className="body-small">
      <span style={{ color, fontWeight: "var(--weight-medium)" }}>
        {sign}
        {format(Math.abs(Math.round(diff * 10) / 10))}
      </span>{" "}
      from {format(previous)}
    </div>
  );
}

export function QuarterComparison({ lines, currentLabel, previousLabel }: { lines: Line[]; currentLabel: string; previousLabel: string }) {
  const plain = (n: number | null) => (n == null ? "—" : String(Math.round(n)));

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Developer</th>
            <th>Target</th>
            {METRICS.map((m) => (
              <th key={m.key}>{m.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const isTeam = line.name === "Team";
            return (
              <tr key={line.name} style={isTeam ? { background: "var(--sand-10)" } : undefined}>
                <td style={{ color: "var(--sand-80)", fontWeight: isTeam ? "var(--weight-bold)" : "var(--weight-medium)" }}>
                  {line.name}
                </td>
                <td>
                  <div style={{ color: "var(--sand-80)" }}>{plain(line.target)}</div>
                  <div className="body-small">was {plain(line.previousTarget)}</div>
                </td>
                {METRICS.map((m) => {
                  const format = m.format ?? plain;
                  return (
                    <td key={m.key}>
                      <div style={{ color: "var(--sand-80)", fontWeight: "var(--weight-medium)" }}>{format(line.current[m.key])}</div>
                      <Change
                        current={line.current[m.key]}
                        previous={line.previous[m.key]}
                        higherIsBetter={m.higherIsBetter}
                        format={format}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="body-small" style={{ padding: ".5rem 1rem", borderTop: "1px solid var(--sand-20)" }}>
        {currentLabel} compared with {previousLabel}. Green is better, red is worse.
      </p>
    </div>
  );
}
