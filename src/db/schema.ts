import { pgTable, serial, text, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";

export const deliveredTasks = pgTable("delivered_tasks", {
  id: serial("id").primaryKey(),
  trelloCardId: text("trello_card_id").notNull().unique(),
  name: text("name").notNull(),
  assignee: text("assignee").notNull(),
  points: integer("points"),
  isBug: boolean("is_bug").notNull().default(false),
  severity: text("severity"),
  deliveredAt: date("delivered_at").notNull(),
  deliveredAtEdited: boolean("delivered_at_edited").notNull().default(false),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  // Which other delivered task's work introduced this bug, set manually.
  // No FK constraint (self-reference) — rows are never deleted, so nothing to enforce.
  causedByTaskId: integer("caused_by_task_id"),
});

export const codeAudits = pgTable("code_audits", {
  id: serial("id").primaryKey(),
  auditDate: date("audit_date").notNull(),
  majorCount: integer("major_count").notNull(),
  minorCount: integer("minor_count").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Which delivered tasks a code audit's bad-practice findings trace back to.
// Many-to-many (an audit can span several tasks). No FK constraints — matches
// the rest of this schema's convention of soft references, rows are never deleted.
export const auditTasks = pgTable("audit_tasks", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull(),
  taskId: integer("task_id").notNull(),
});

// User-editable per-assignee quarterly point target (unlike the team-wide
// targets in lib/targets.ts, these are set live from the dashboard, not code).
export const assigneeTargets = pgTable("assignee_targets", {
  assignee: text("assignee").primaryKey(),
  quarterTarget: integer("quarter_target").notNull(),
});
