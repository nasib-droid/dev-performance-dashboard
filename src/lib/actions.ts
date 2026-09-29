"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { codeAudits, deliveredTasks, auditTasks, assigneeTargets } from "@/db/schema";
import { COOKIE_NAME, createSessionCookieValue } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.DASHBOARD_PASSWORD) {
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
  await db.update(deliveredTasks).set({ severity }).where(eq(deliveredTasks.id, taskId));
  revalidatePath("/");
}

export async function setDeliveredAt(taskId: number, deliveredAt: string) {
  await db
    .update(deliveredTasks)
    .set({ deliveredAt, deliveredAtEdited: true })
    .where(eq(deliveredTasks.id, taskId));
  revalidatePath("/");
}

export async function setCausedBy(taskId: number, causedByTaskId: number | null) {
  await db.update(deliveredTasks).set({ causedByTaskId }).where(eq(deliveredTasks.id, taskId));
  revalidatePath("/");
}

// Sync never re-touches is_bug after insert (only set at insert time), so this sticks permanently.
export async function markNotABug(taskId: number) {
  await db.update(deliveredTasks).set({ isBug: false }).where(eq(deliveredTasks.id, taskId));
  revalidatePath("/");
}

export async function linkAuditTask(auditId: number, taskId: number) {
  await db.insert(auditTasks).values({ auditId, taskId });
  revalidatePath("/");
  revalidatePath("/audits");
}

export async function unlinkAuditTask(linkId: number) {
  await db.delete(auditTasks).where(eq(auditTasks.id, linkId));
  revalidatePath("/");
  revalidatePath("/audits");
}

export async function setAssigneeTarget(assignee: string, quarterTarget: number) {
  await db
    .insert(assigneeTargets)
    .values({ assignee, quarterTarget })
    .onConflictDoUpdate({ target: assigneeTargets.assignee, set: { quarterTarget } });
  revalidatePath("/");
}

export async function createAudit(formData: FormData) {
  const auditDate = String(formData.get("auditDate"));
  const majorCount = Number(formData.get("majorCount"));
  const minorCount = Number(formData.get("minorCount"));
  const notes = String(formData.get("notes") ?? "") || null;

  await db.insert(codeAudits).values({ auditDate, majorCount, minorCount, notes });
  revalidatePath("/audits");
  revalidatePath("/");
}
