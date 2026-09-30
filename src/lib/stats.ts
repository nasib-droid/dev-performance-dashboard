import { taskSize } from "@/lib/targets";

type Task = { points: number | null; isBug: boolean };

export function summarize(tasks: Task[]) {
  const points = tasks.reduce((sum, t) => sum + (t.points ?? 0), 0);
  const bugs = tasks.filter((t) => t.isBug).length;
  return {
    points,
    tasks: tasks.length,
    major: tasks.filter((t) => taskSize(t.points) === "Major").length,
    bugs,
    bugRate: points > 0 ? (bugs / points) * 100 : null,
  };
}

export type Summary = ReturnType<typeof summarize>;

export const formatRate = (rate: number | null) => (rate == null ? "—" : rate.toFixed(1));
