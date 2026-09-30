import { median } from "@/lib/cycle";
import { TASK_SIZES } from "@/lib/targets";

type Row = { assignee: string; size: string; building: number | null; qa: number | null };

const formatDays = (n: number | null) => (n == null ? "—" : `${n < 10 ? n.toFixed(1) : Math.round(n)} d`);
const known = (values: (number | null)[]) => values.filter((v): v is number => v != null);

function Cell({ values, of }: { values: number[]; of?: number }) {
  return (
    <>
      <div style={{ color: "var(--sand-80)", fontWeight: "var(--weight-medium)" }}>{formatDays(median(values))}</div>
      <div className="body-small">
        {of == null ? `${values.length} ${values.length === 1 ? "task" : "tasks"}` : `${values.length} of ${of} tasks`}
      </div>
    </>
  );
}

export function CycleTimeTable({ developers, rows }: { developers: string[]; rows: Row[] }) {
  if (!rows.some((r) => r.building != null || r.qa != null)) {
    return <p className="body-small">No Trello history for tasks delivered in this period yet. Run a sync to load it.</p>;
  }

  const lines = developers.map((name) => ({ name, rows: rows.filter((r) => r.assignee === name) })).filter((l) => l.rows.length > 0);
  if (lines.length > 1) lines.push({ name: "Team", rows });

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Developer</th>
            {TASK_SIZES.map((s) => (
              <th key={s.label}>
                {s.label}
                <span style={{ fontWeight: "var(--weight-regular)", textTransform: "none", letterSpacing: 0 }}> · {s.range}</span>
              </th>
            ))}
            <th>Waiting for QA</th>
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
                {TASK_SIZES.map((s) => {
                  const sized = line.rows.filter((r) => r.size === s.label);
                  return (
                    <td key={s.label}>
                      <Cell values={known(sized.map((r) => r.building))} of={sized.length} />
                    </td>
                  );
                })}
                <td>
                  <Cell values={known(line.rows.map((r) => r.qa))} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
