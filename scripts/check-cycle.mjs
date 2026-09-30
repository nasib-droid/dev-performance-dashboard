import assert from "node:assert/strict";
import { workingDays, cycleTime, median, cardCreatedAt } from "../src/lib/cycle.ts";
import { weekdaysBetween, adjacentQuarters } from "../src/lib/quarter.ts";

// Times are IST (+05:30). 2026-09-25 is a Friday.
const ist = (s) => new Date(`${s}+05:30`);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

close(workingDays(ist("2026-09-21T09:00"), ist("2026-09-21T21:00")), 0.5);
close(workingDays(ist("2026-09-25T12:00"), ist("2026-09-28T12:00")), 1); // Fri noon -> Mon noon skips the weekend
close(workingDays(ist("2026-09-26T10:00"), ist("2026-09-27T20:00")), 0); // all weekend
close(workingDays(ist("2026-09-21T00:00"), ist("2026-09-28T00:00")), 5);

const moves = [
  { toList: "Spec'd & Approved", movedAt: ist("2026-09-18T09:00") },
  { toList: "In Progress", movedAt: ist("2026-09-21T09:00") },
  { toList: "In QA", movedAt: ist("2026-09-23T09:00") },
  { toList: "In Progress", movedAt: ist("2026-09-24T09:00") },
  { toList: "In QA", movedAt: ist("2026-09-24T21:00") },
  { toList: "Delivered", movedAt: ist("2026-09-25T09:00") },
];
const c = cycleTime(moves, "Delivered");
close(c.building, 2.5);
close(c.qa, 1.5);

const skippedQa = cycleTime(
  [
    { toList: "In Progress", movedAt: ist("2026-09-21T09:00") },
    { toList: "Delivered", movedAt: ist("2026-09-21T15:00") },
  ],
  "Delivered"
);
close(skippedQa.building, 0.25);
assert.equal(skippedQa.qa, null);

// Created straight into In Progress: Trello's first logged move is *from* In Progress.
const createdInProgress = cycleTime(
  [
    { fromList: "In Progress", toList: "In QA", movedAt: ist("2026-09-22T09:00") },
    { fromList: "In QA", toList: "Delivered", movedAt: ist("2026-09-22T21:00") },
  ],
  "Delivered",
  ist("2026-09-21T09:00")
);
close(createdInProgress.building, 1);
close(createdInProgress.qa, 0.5);

// Skipped In Progress (Spec'd -> In QA): QA wait still counts, building is unknown.
const skippedBuild = cycleTime(
  [
    { fromList: "Spec'd & Approved", toList: "In QA", movedAt: ist("2026-09-21T09:00") },
    { fromList: "In QA", toList: "Delivered", movedAt: ist("2026-09-22T09:00") },
  ],
  "Delivered",
  ist("2026-09-01T09:00")
);
assert.equal(skippedBuild.building, null);
close(skippedBuild.qa, 1);

assert.deepEqual(cycleTime([{ toList: "Delivered", movedAt: ist("2026-09-25T09:00") }], "Delivered"), { building: null, qa: null });
assert.equal(cycleTime([{ toList: "In Progress", movedAt: ist("2026-09-25T09:00") }], "Delivered"), null);
// Real card "Batched candidate scoring"; Trello's createCard action is 2026-09-01T09:20:14.040Z.
assert.equal(cardCreatedAt("6a9698ceebcb4357eee575e7").toISOString(), "2026-09-01T09:20:14.000Z");

assert.equal(median([]), null);
assert.equal(median([3, 1, 2]), 2);
assert.equal(median([4, 1, 2, 3]), 2.5);

const utc = (s) => new Date(`${s}T00:00:00Z`);
assert.equal(weekdaysBetween(utc("2026-09-21"), utc("2026-09-25")), 5); // Mon-Fri
assert.equal(weekdaysBetween(utc("2026-09-25"), utc("2026-09-28")), 2); // Fri + Mon
assert.equal(weekdaysBetween(utc("2026-09-26"), utc("2026-09-27")), 0); // weekend
assert.equal(weekdaysBetween(utc("2026-07-01"), utc("2026-09-30")), 66); // Q3 2026
assert.equal(weekdaysBetween(utc("2026-09-30"), utc("2026-09-01")), 0); // end before start

const around = adjacentQuarters("2026-09-30");
assert.deepEqual(around.prev, { from: "2026-04-01", to: "2026-06-30", label: "Q2 2026" });
assert.deepEqual(around.next, { from: "2026-10-01", to: "2026-12-31", label: "Q4 2026" });
assert.equal(adjacentQuarters("2026-01-15").prev.label, "Q4 2025"); // year boundary
assert.equal(adjacentQuarters("2026-12-31").next.label, "Q1 2027");
assert.equal(adjacentQuarters("2026-08-10").prev.to, "2026-06-30"); // mid-quarter date

console.log("cycle checks passed");
