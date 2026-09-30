"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { codeAudits, deliveredTasks, auditTasks, quarterTargets } from "@/db/schema";
import { COOKIE_NAME, createSessionCookieValue } from "@/lib/session";
import { revalidatePath } from "next/cache";

const SEVERITIES = ["High", "Medium", "Low"];
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isCount = (v: number) => Number.isInteger(v) && v >= 0;
const isId = (v: number) => Number.isInteger(v) && v > 0;
const sha256 = (s: string) => createHash("sha256").update(s).digest();

function assert(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected || !timingSafeEqual(sha256(password), sha256(expected))) {
    redirect("/login?error=1");
  }
  const { value, maxAgeSeconds } = await createSessionCookieValue();
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });
  redirect("/");
}

export async function setSeverity(taskId: number, severity: "High" | "Medium" | "Low") {
  assert(isId(taskId) && SEVERITIES.includes(severity), "Invalid severity");
  await db.update(deliveredTasks).set({ severity }).where(eq(deliveredTasks.id, taskId));
  revalidatePath("/");
}

export async function setDeliveredAt(taskId: number, deliveredAt: string) {
  assert(isId(taskId) && isDate(deliveredAt), "Invalid date");
  await db
    .update(deliveredTasks)
    .set({ deliveredAt, deliveredAtEdited: true })
    .where(eq(deliveredTasks.id, taskId));
  revalidatePath("/");
}

export async function setCausedBy(taskId: number, causedByTaskId: number | null) {
  assert(isId(taskId) && (causedByTaskId === null || (isId(causedByTaskId) && causedByTaskId !== taskId)), "Invalid task");
  await db.update(deliveredTasks).set({ causedByTaskId }).where(eq(deliveredTasks.id, taskId));
  revalidatePath("/");
}

// Sync never re-touches is_bug after insert (only set at insert time), so this sticks permanently.
export async function markNotABug(taskId: number) {
  await db.update(deliveredTasks).set({ isBug: false }).where(eq(deliveredTasks.id, taskId));
  revalidatePath("/");
}

export async function linkAuditTask(auditId: number, taskId: number) {
  assert(isId(auditId) && isId(taskId), "Invalid link");
  await db.insert(auditTasks).values({ auditId, taskId });
  revalidatePath("/");
  revalidatePath("/audits");
}

export async function unlinkAuditTask(linkId: number) {
  await db.delete(auditTasks).where(eq(auditTasks.id, linkId));
  revalidatePath("/");
  revalidatePath("/audits");
}

export async function setAssigneeTarget(assignee: string, quarter: string, target: number) {
  assert(
    typeof assignee === "string" && assignee.length > 0 && /^\d{4}-Q[1-4]$/.test(quarter) && isCount(target),
    "Invalid target"
  );
  await db
    .insert(quarterTargets)
    .values({ assignee, quarter, target })
    .onConflictDoUpdate({ target: [quarterTargets.assignee, quarterTargets.quarter], set: { target } });
  revalidatePath("/");
}

export async function createAudit(formData: FormData) {
  const auditDate = String(formData.get("auditDate"));
  const majorCount = Number(formData.get("majorCount"));
  const minorCount = Number(formData.get("minorCount"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  assert(isDate(auditDate) && isCount(majorCount) && isCount(minorCount), "Invalid audit");

  await db.insert(codeAudits).values({ auditDate, majorCount, minorCount, notes });
  revalidatePath("/audits");
  revalidatePath("/");
}
