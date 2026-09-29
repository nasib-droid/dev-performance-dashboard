import { and, gte, lte, eq, isNull, isNotNull, asc, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deliveredTasks, codeAudits, auditTasks, assigneeTargets } from "@/db/schema";
import { parseDateRange, formatRangeLabel, weekStart, weeksElapsedInRange, toDateStr } from "@/lib/quarter";
import { BUG_CAPS, QUARTER_POINT_TARGET } from "@/lib/targets";
import { VolumeChart } from "@/components/VolumeChart";
import { AuditsChart } from "@/components/AuditsChart";
import { CapBar } from "@/components/CapBar";
import { SyncButton } from "@/components/SyncButton";
import { SeverityDropdown } from "@/components/SeverityDropdown";
import { DeliveredDateEditor } from "@/components/DeliveredDateEditor";
import { DateRangeForm } from "@/components/DateRangeForm";
import { CausedByPicker } from "@/components/CausedByPicker";
import { NotABugButton } from "@/components/NotABugButton";
import { IndividualTargets } from "@/components/IndividualTargets";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { start, end } = parseDateRange(params);
  const startStr = toDateStr(start);
  const endStr = toDateStr(end);
  const label = formatRangeLabel(start, end);

  const [tasksInRange, unclassifiedBugs, classifiedBugs, auditsInRange, causeOptions] = await Promise.all([
    db
      .select()
      .from(deliveredTasks)
      .where(and(gte(deliveredTasks.deliveredAt, startStr), lte(deliveredTasks.deliveredAt, endStr))),
    db
      .select()
      .from(deliveredTasks)
      .where(
        and(
          eq(deliveredTasks.isBug, true),
          isNull(deliveredTasks.severity),
          gte(deliveredTasks.deliveredAt, startStr),
          lte(deliveredTasks.deliveredAt, endStr)
        )
      )
      .orderBy(asc(deliveredTasks.deliveredAt)),
    db
      .select()
      .from(deliveredTasks)
      .where(
        and(
          eq(deliveredTasks.isBug, true),
          isNotNull(deliveredTasks.severity),
          gte(deliveredTasks.deliveredAt, startStr),
          lte(deliveredTasks.deliveredAt, endStr)
        )
      )
      .orderBy(desc(deliveredTasks.deliveredAt)),
    db
      .select()
      .from(codeAudits)
      .where(and(gte(codeAudits.auditDate, startStr), lte(codeAudits.auditDate, endStr)))
      .orderBy(asc(codeAudits.auditDate)),
    db
      .select({
        id: deliveredTasks.id,
        name: deliveredTasks.name,
        assignee: deliveredTasks.assignee,
        deliveredAt: deliveredTasks.deliveredAt,
      })
      .from(deliveredTasks)
      .orderBy(desc(deliveredTasks.deliveredAt)),
  ]);

  const targetRows = await db.select().from(assigneeTargets);

  // Volume: weekly points stacked by assignee
  const assignees = [...new Set(tasksInRange.map((t) => t.assignee))].sort();
  const weeks = weeksElapsedInRange(start, end);
  const byWeek = new Map<string, Record<string, number>>();
  for (const w of weeks) byWeek.set(w, {});
  for (const t of tasksInRange) {
    const w = weekStart(t.deliveredAt);
    if (!byWeek.has(w)) continue;
    const bucket = byWeek.get(w)!;
    bucket[t.assignee] = (bucket[t.assignee] ?? 0) + (t.points ?? 0);
  }
  const volumeData = weeks.map((w) => ({ week: w, ...byWeek.get(w) }));
  const rangeTotal = tasksInRange.reduce((sum, t) => sum + (t.points ?? 0), 0);
  const pointsByAssignee = new Map<string, number>();
  for (const t of tasksInRange) {
    pointsByAssignee.set(t.assignee, (pointsByAssignee.get(t.assignee) ?? 0) + (t.points ?? 0));
  }
  const targetByAssignee = new Map(targetRows.map((r) => [r.assignee, r.quarterTarget]));
  const knownAssignees = [...new Set(causeOptions.map((t) => t.assignee))].filter((a) => a !== "Unassigned").sort();
  const targetTableRows = knownAssignees.map((assignee) => ({
    assignee,
    points: pointsByAssignee.get(assignee) ?? 0,
    target: targetByAssignee.get(assignee) ?? null,
  }));
  // Team target = sum of individual targets once any are set; falls back to the
  // static team-wide constant until someone configures at least one.
  const individualTargetSum = targetRows.reduce((sum, r) => sum + r.quarterTarget, 0);
  const teamTarget = individualTargetSum > 0 ? individualTargetSum : QUARTER_POINT_TARGET;
  const volumeTasks = tasksInRange.map((t) => ({
    id: t.id,
    name: t.name,
    assignee: t.assignee,
    points: t.points,
    deliveredAt: t.deliveredAt,
    week: weekStart(t.deliveredAt),
  }));

  // Quality: bug counts by severity
  const bugCounts = { High: 0, Medium: 0, Low: 0 };
  for (const t of tasksInRange) {
    if (t.isBug && t.severity && t.severity in bugCounts) {
      bugCounts[t.severity as keyof typeof bugCounts]++;
    }
  }

  // Best practices: audits
  const auditsData = auditsInRange.map((a) => ({
    id: a.id,
    date: a.auditDate,
    major: a.majorCount,
    minor: a.minorCount,
    notes: a.notes,
  }));
  const auditTaskLinks = auditsInRange.length
    ? await db
        .select({
          linkId: auditTasks.id,
          auditId: auditTasks.auditId,
          taskId: auditTasks.taskId,
          taskName: deliveredTasks.name,
          taskAssignee: deliveredTasks.assignee,
        })
        .from(auditTasks)
        .innerJoin(deliveredTasks, eq(auditTasks.taskId, deliveredTasks.id))
        .where(inArray(auditTasks.auditId, auditsInRange.map((a) => a.id)))
    : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title-main">Dev Performance Dashboard</h1>
          <p className="breadcrumb">{label}</p>
        </div>
        <SyncButton />
      </div>

      <div className="card mb-6">
        <DateRangeForm from={startStr} to={endStr} />
      </div>

      {/* Stat tile — flagged gap: Luma has no dedicated dashboard stat-tile component,
          so this is composed from the standard card surface + page-title-main / overline
          typography (interim treatment agreed with Andrew, proposed token 1a-stat-tile). */}
      <div className="card mb-6" style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
        <span className="overline">Points delivered</span>
        <span className="page-title-main">{rangeTotal}</span>
        <span className="body-small">/ {teamTarget} pts quarterly target</span>
      </div>

      <section className="card mb-6">
        <h2 className="heading-3 mb-4">Volume</h2>
        <VolumeChart data={volumeData} assignees={assignees} tasks={volumeTasks} />
        <div className="mt-6" style={{ borderTop: "1px solid var(--sand-20)", paddingTop: "1rem" }}>
          <p className="input-label mb-2" style={{ fontSize: "var(--font-size-sm)" }}>
            Individual targets — points delivered in the selected period
          </p>
          <IndividualTargets rows={targetTableRows} />
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="heading-3 mb-4">Quality</h2>
        {/* Cap tracker — Luma has no meter/progress-bar primitive anywhere in the guide,
            so caps are shown as a label + semantic pill (pill-green / pill-red) instead
            of inventing a bar visual (proposed token 1a-quota-row). */}
        <div>
          {[
            { label: "High", count: bugCounts.High, cap: BUG_CAPS.High },
            { label: "Medium", count: bugCounts.Medium, cap: BUG_CAPS.Medium },
            { label: "Low", count: bugCounts.Low, cap: BUG_CAPS.Low },
          ].map((row, i) => (
            <div key={row.label} style={i < 2 ? { borderBottom: "1px solid var(--sand-20)" } : undefined}>
              <CapBar label={row.label} count={row.count} cap={row.cap} />
            </div>
          ))}
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="heading-3 mb-4">Best practices (code audits)</h2>
        {auditsData.length > 0 ? (
          <AuditsChart data={auditsData} links={auditTaskLinks} taskOptions={causeOptions} />
        ) : (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="8" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M6 18h36" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 10v4M32 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <div className="empty-title">No audits logged in this period</div>
            <div className="empty-desc">Log one from the Audits page to see it charted here.</div>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="heading-3 mb-4">Unclassified bugs</h2>
        <p className="body-small mb-4">Delivered in the selected period.</p>
        {unclassifiedBugs.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 48 48" fill="none">
              <path d="M18 20l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <div className="empty-title">Nothing to classify</div>
            <div className="empty-desc">Every delivered bug has a severity set.</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Fixed by</th>
                  <th>Delivered</th>
                  <th>Caused by</th>
                  <th>Severity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {unclassifiedBugs.map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: "var(--sand-80)", fontWeight: "var(--weight-medium)" }}>{t.name}</td>
                    <td>{t.assignee}</td>
                    <td>
                      <DeliveredDateEditor taskId={t.id} deliveredAt={t.deliveredAt} />
                    </td>
                    <td>
                      <CausedByPicker taskId={t.id} causedByTaskId={t.causedByTaskId} options={causeOptions} />
                    </td>
                    <td>
                      <SeverityDropdown taskId={t.id} />
                    </td>
                    <td>
                      <NotABugButton taskId={t.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card mt-6">
        <h2 className="heading-3 mb-4">Classified bugs</h2>
        <p className="body-small mb-4">Delivered in the selected period.</p>
        {classifiedBugs.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 48 48" fill="none">
              <path d="M18 20l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <div className="empty-title">No bugs classified yet</div>
            <div className="empty-desc">Set a severity in Unclassified Bugs and it&rsquo;ll show up here.</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Fixed by</th>
                  <th>Delivered</th>
                  <th>Caused by</th>
                  <th>Severity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classifiedBugs.map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: "var(--sand-80)", fontWeight: "var(--weight-medium)" }}>{t.name}</td>
                    <td>{t.assignee}</td>
                    <td>{t.deliveredAt}</td>
                    <td>
                      <CausedByPicker taskId={t.id} causedByTaskId={t.causedByTaskId} options={causeOptions} />
                    </td>
                    <td>
                      <span
                        className={`pill pill-sm ${t.severity === "High" ? "pill-red" : t.severity === "Medium" ? "pill-orange" : "pill-default"}`}
                      >
                        {t.severity}
                      </span>
                    </td>
                    <td>
                      <NotABugButton taskId={t.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
