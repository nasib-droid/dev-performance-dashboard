import { and, gte, lte, eq, isNull, isNotNull, asc, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deliveredTasks, codeAudits, auditTasks, quarterTargets, cardMoves } from "@/db/schema";
import {
  getCurrentQuarterRange,
  parseDateRange,
  formatRangeLabel,
  weekStart,
  weeksElapsedInRange,
  toDateStr,
  quarterKey,
  quarterLabel,
  quarterDays,
  dayNumberSince,
  weekdaysBetween,
  untilToday,
} from "@/lib/quarter";
import { BUG_CAPS, TASK_SIZES, taskSize } from "@/lib/targets";
import { BreakdownTable } from "@/components/BreakdownTable";
import { CycleTimeTable } from "@/components/CycleTimeTable";
import { QuarterComparison } from "@/components/QuarterComparison";
import { NeedsAttention } from "@/components/NeedsAttention";
import { cardCreatedAt, cycleTime, type Move } from "@/lib/cycle";
import { summarize, formatRate } from "@/lib/stats";
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

  const DAY_MS = 86_400_000;
  const quarter = getCurrentQuarterRange(start);
  const previousQuarter = getCurrentQuarterRange(new Date(quarter.start.getTime() - DAY_MS));
  const targetQuarter = quarterKey(start);
  const targetQuarterLabel = quarterLabel(targetQuarter);
  const prevQuarterKey = quarterKey(previousQuarter.start);
  const rangeCardIds = tasksInRange.map((t) => t.trelloCardId);

  const [allTargetRows, quarterTasks, moves] = await Promise.all([
    db.select().from(quarterTargets).where(inArray(quarterTargets.quarter, [targetQuarter, prevQuarterKey])),
    db
      .select()
      .from(deliveredTasks)
      .where(
        and(
          gte(deliveredTasks.deliveredAt, toDateStr(previousQuarter.start)),
          lte(deliveredTasks.deliveredAt, toDateStr(quarter.end))
        )
      ),
    rangeCardIds.length
      ? db
          .select({
            cardId: cardMoves.trelloCardId,
            fromList: cardMoves.fromList,
            toList: cardMoves.toList,
            toListId: cardMoves.toListId,
            movedAt: cardMoves.movedAt,
          })
          .from(cardMoves)
          .where(inArray(cardMoves.trelloCardId, rangeCardIds))
      : Promise.resolve([]),
  ]);
  const targetRows = allTargetRows.filter((r) => r.quarter === targetQuarter);

  // Pace: current speed projected to the quarter's end. Only for the whole current quarter,
  // and only from day 14, before that a single big task swings the projection wildly.
  const daysInQuarter = quarterDays(start);
  const elapsedDays = dayNumberSince(quarter.start);
  const isWholeQuarter = startStr === toDateStr(quarter.start) && endStr === toDateStr(quarter.end);
  const isCurrentQuarter = elapsedDays >= 1 && elapsedDays <= daysInQuarter;
  const showPace = isWholeQuarter && isCurrentQuarter && elapsedDays >= 14;
  const pace = (points: number) => (showPace ? Math.round((points / elapsedDays) * daysInQuarter) : null);

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
  const targetByAssignee = new Map(targetRows.map((r) => [r.assignee, r.target]));
  const knownAssignees = [...new Set(causeOptions.map((t) => t.assignee))].filter((a) => a !== "Unassigned").sort();
  // Working days (Mon–Fri) in the selected period that have happened so far.
  const rangeWorkingDays = weekdaysBetween(start, untilToday(end));
  const perDay = (points: number) => (rangeWorkingDays > 0 ? points / rangeWorkingDays : null);
  const targetTableRows = knownAssignees.map((assignee) => ({
    assignee,
    points: pointsByAssignee.get(assignee) ?? 0,
    target: targetByAssignee.get(assignee) ?? null,
    pace: pace(pointsByAssignee.get(assignee) ?? 0),
    perDay: perDay(pointsByAssignee.get(assignee) ?? 0),
  }));
  const teamPace = pace(rangeTotal);
  const teamPerDay = perDay(rangeTotal);
  const teamTarget = targetRows.reduce((sum, r) => sum + r.target, 0);
  const weeklyTarget = teamTarget > 0 ? Math.round((teamTarget * 7) / quarterDays(start)) : null;
  const volumeTasks = tasksInRange.map((t) => ({
    id: t.id,
    name: t.name,
    assignee: t.assignee,
    points: t.points,
    deliveredAt: t.deliveredAt,
    week: weekStart(t.deliveredAt),
  }));

  const developers = [...knownAssignees, ...(assignees.includes("Unassigned") ? ["Unassigned"] : [])];
  const segmented = (tasks: typeof tasksInRange, segment: (t: (typeof tasksInRange)[number]) => string) =>
    tasks.map((t) => ({
      id: t.id,
      name: t.name,
      assignee: t.assignee,
      points: t.points,
      deliveredAt: t.deliveredAt,
      segment: segment(t),
    }));

  const sizeTasks = segmented(tasksInRange, (t) => taskSize(t.points));
  const sizeColumns = [
    ...TASK_SIZES.map((s) => ({
      key: s.label,
      label: s.label,
      hint: s.range,
      pill: s.label === "Major" ? "pill-blue" : s.label === "Medium" ? "pill-green" : "pill-default",
    })),
    { key: "Unpointed", label: "No points", pill: "pill-orange" },
  ];

  const bugsInRange = tasksInRange.filter((t) => t.isBug);
  const bugTasks = segmented(bugsInRange, (t) => t.severity ?? "Unclassified");
  const bugDevelopers = developers.filter((d) => d !== "Unassigned" || bugTasks.some((t) => t.assignee === d));
  const bugColumns = [
    { key: "High", label: "High", pill: "pill-red" },
    { key: "Medium", label: "Medium", pill: "pill-orange" },
    { key: "Low", label: "Low", pill: "pill-default" },
    { key: "Unclassified", label: "Unclassified", pill: "pill-default" },
  ];

  const bugCounts = { High: 0, Medium: 0, Low: 0 };
  for (const t of bugsInRange) {
    if (t.severity && t.severity in bugCounts) bugCounts[t.severity as keyof typeof bugCounts]++;
  }
  const bugRates = [
    ...bugDevelopers.map((name) => ({ name, rate: summarize(tasksInRange.filter((t) => t.assignee === name)).bugRate })),
    { name: "Team", rate: summarize(tasksInRange).bugRate },
  ];

  const DELIVERED = "__delivered__";
  const movesByCard = new Map<string, Move[]>();
  for (const m of moves) {
    const list = movesByCard.get(m.cardId) ?? [];
    list.push({
      fromList: m.fromList,
      toList: m.toListId === process.env.TRELLO_DELIVERED_LIST_ID ? DELIVERED : m.toList,
      movedAt: m.movedAt,
    });
    movesByCard.set(m.cardId, list);
  }
  const cycleRows = tasksInRange.map((t) => {
    const c = cycleTime(movesByCard.get(t.trelloCardId) ?? [], DELIVERED, cardCreatedAt(t.trelloCardId));
    return { assignee: t.assignee, size: taskSize(t.points), building: c?.building ?? null, qa: c?.qa ?? null };
  });

  const inQuarter = (t: { deliveredAt: string }, q: { start: Date; end: Date }) =>
    t.deliveredAt >= toDateStr(q.start) && t.deliveredAt <= toDateStr(q.end);
  const currentTasks = quarterTasks.filter((t) => inQuarter(t, quarter));
  const previousTasks = quarterTasks.filter((t) => inQuarter(t, previousQuarter));
  const targetFor = (q: string, name?: string) => {
    const rows = allTargetRows.filter((r) => r.quarter === q && (name === undefined || r.assignee === name));
    return rows.length ? rows.reduce((sum, r) => sum + r.target, 0) : null;
  };
  const currentDays = weekdaysBetween(quarter.start, untilToday(quarter.end));
  const previousDays = weekdaysBetween(previousQuarter.start, previousQuarter.end);
  const comparisonLines = [
    ...knownAssignees.map((name) => ({
      name,
      current: summarize(currentTasks.filter((t) => t.assignee === name), currentDays),
      previous: summarize(previousTasks.filter((t) => t.assignee === name), previousDays),
      target: targetFor(targetQuarter, name),
      previousTarget: targetFor(prevQuarterKey, name),
    })),
    {
      name: "Team",
      current: summarize(currentTasks, currentDays),
      previous: summarize(previousTasks, previousDays),
      target: targetFor(targetQuarter),
      previousTarget: targetFor(prevQuarterKey),
    },
  ];

  const attention = [
    { label: "tasks without points", singular: "task without points", tasks: tasksInRange.filter((t) => t.points == null) },
    {
      label: "cards without a developer name",
      singular: "card without a developer name",
      tasks: tasksInRange.filter((t) => t.assignee === "Unassigned"),
    },
    { label: "bugs without a severity", singular: "bug without a severity", tasks: unclassifiedBugs },
  ];

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
          <NeedsAttention groups={attention} />
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
        <span className="body-small">
          {teamTarget > 0
            ? `/ ${teamTarget} pts ${targetQuarterLabel} target · ${weeklyTarget} pts a week`
            : `No ${targetQuarterLabel} targets set yet. Add them under Volume.`}
        </span>
        {teamPerDay != null && <span className="body-small">· {teamPerDay.toFixed(1)} pts / working day</span>}
        {teamPace != null && (
          <span
            className="body-small"
            style={{ color: teamTarget === 0 || teamPace >= teamTarget ? "var(--evergreen-70)" : "var(--ember-60)" }}
          >
            · on pace for {teamPace} pts
          </span>
        )}
      </div>

      <section className="card mb-6">
        <h2 className="heading-3 mb-4">Volume</h2>
        <VolumeChart data={volumeData} assignees={assignees} tasks={volumeTasks} weeklyTarget={weeklyTarget} />
        <div className="mt-6" style={{ borderTop: "1px solid var(--sand-20)", paddingTop: "1rem" }}>
          <p className="input-label mb-1" style={{ fontSize: "var(--font-size-sm)" }}>
            {targetQuarterLabel} targets: points delivered in the selected period
          </p>
          <p className="body-small mb-2">
            {showPace
              ? "On pace for: where you'll finish the quarter if you keep your current speed."
              : isWholeQuarter && isCurrentQuarter
                ? "Pace appears from day 14 of the quarter, once there's enough work to project from."
                : "Pace shows when the whole current quarter is selected."}
          </p>
          <IndividualTargets rows={targetTableRows} quarter={targetQuarter} />
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="heading-3 mb-1">Quarter over quarter</h2>
        <p className="body-small mb-4">
          {targetQuarterLabel}
          {isCurrentQuarter ? " so far" : ""} compared with the whole of {quarterLabel(prevQuarterKey)}, per developer.
        </p>
        <QuarterComparison
          lines={comparisonLines}
          currentLabel={`${targetQuarterLabel}${isCurrentQuarter ? " so far" : ""}`}
          previousLabel={quarterLabel(prevQuarterKey)}
        />
      </section>

      <section className="card mb-6">
        <h2 className="heading-3 mb-1">Tasks by size</h2>
        <p className="body-small mb-4">Delivered tasks per developer, grouped by story points.</p>
        <BreakdownTable columns={sizeColumns} developers={developers} tasks={sizeTasks} noun="tasks" segmentLabel="Size" />
      </section>

      <section className="card mb-6">
        <h2 className="heading-3 mb-1">Cycle time</h2>
        <p className="body-small mb-2">
          How many working days (weekends excluded) a task typically spent In Progress, for tasks delivered in this
          period, split by task size. &ldquo;Typical&rdquo; is the middle value, so one unusually long task
          doesn&rsquo;t skew it. Waiting for QA is typical time spent In QA, which isn&rsquo;t on the developer.
        </p>
        <p className="body-small mb-4">
          &ldquo;27 of 33 tasks&rdquo; means 27 tasks had Trello history to measure. The rest skipped the In Progress
          column (for example Spec&rsquo;d straight to QA) or were created straight into Delivered. Points measure
          scope, not time, so use this for planning, not for judging single tasks.
        </p>
        <CycleTimeTable developers={developers} rows={cycleRows} />
      </section>

      <section className="card mb-6">
        <h2 className="heading-3 mb-1">Quality: bugs delivered</h2>
        <p className="body-small mb-4">
          Quality is measured by bugs. Every bug delivered in this period counts against its severity cap. Lower is better.
        </p>
        <div className="mb-4" style={{ display: "flex", alignItems: "baseline", gap: ".75rem", flexWrap: "wrap" }}>
          <span className="page-title-main">{bugsInRange.length}</span>
          <span className="body-small">{bugsInRange.length === 1 ? "bug" : "bugs"} in this period</span>
          {unclassifiedBugs.length > 0 && (
            <span className="pill pill-orange">{unclassifiedBugs.length} still need a severity</span>
          )}
        </div>
        {/* Cap tracker — Luma has no meter/progress-bar primitive anywhere in the guide,
            so caps are shown as a label + semantic pill (pill-green / pill-red) instead
            of inventing a bar visual (proposed token 1a-quota-row). */}
        <div className="mb-6">
          {[
            { label: "High severity", count: bugCounts.High, cap: BUG_CAPS.High },
            { label: "Medium severity", count: bugCounts.Medium, cap: BUG_CAPS.Medium },
            { label: "Low severity", count: bugCounts.Low, cap: BUG_CAPS.Low },
          ].map((row, i) => (
            <div key={row.label} style={i < 2 ? { borderBottom: "1px solid var(--sand-20)" } : undefined}>
              <CapBar label={row.label} count={row.count} cap={row.cap} />
            </div>
          ))}
        </div>
        <p className="input-label mb-2" style={{ fontSize: "var(--font-size-sm)" }}>
          Bugs by developer, from the Fixed by name on each bug
        </p>
        <BreakdownTable columns={bugColumns} developers={bugDevelopers} tasks={bugTasks} noun="bugs" segmentLabel="Severity" />
        <div className="mt-4" style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
          <span className="input-label" style={{ fontSize: "var(--font-size-sm)" }}>
            Bugs per 100 points delivered
          </span>
          {bugRates.map((r) => (
            <span key={r.name} className="pill pill-default">
              {r.name}: {formatRate(r.rate)}
            </span>
          ))}
        </div>
        <p className="body-small mt-1">
          Compares bugs with how much each person delivered, so someone who delivers more isn&rsquo;t penalised for it.
        </p>
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
