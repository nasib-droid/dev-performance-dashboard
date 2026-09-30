export type Move = { fromList?: string | null; toList: string; movedAt: Date };

// Trello card ids start with the card's creation time (seconds, hex), like a Mongo ObjectId.
export function cardCreatedAt(cardId: string) {
  return new Date(parseInt(cardId.slice(0, 8), 16) * 1000);
}

export const BUILD_LIST = "In Progress";
export const QA_LIST = "In QA";

// ponytail: team works on IST, so weekends are Sat/Sun in UTC+5:30. Change if the team spreads across zones.
const TEAM_UTC_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

// Elapsed time between two instants in days, not counting Saturdays and Sundays.
export function workingDays(from: Date, to: Date) {
  let t = from.getTime() + TEAM_UTC_OFFSET_MS;
  const end = to.getTime() + TEAM_UTC_OFFSET_MS;
  let total = 0;
  while (t < end) {
    const segmentEnd = Math.min((Math.floor(t / DAY_MS) + 1) * DAY_MS, end);
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) total += (segmentEnd - t) / DAY_MS;
    t = segmentEnd;
  }
  return total;
}

// Working days a card spent In Progress (building) and In QA (waiting for QA), up to its
// last move into Delivered. Moves back and forth are summed. A card created directly in a
// list (Trello logs no move for that) counts as entering it at createdAt.
// building is null if the card never sat In Progress (e.g. Spec'd -> In QA); qa is null if
// it skipped QA, so small direct-to-Delivered changes don't drag the QA figure to zero.
// Returns null when the card has no recorded move into Delivered.
export function cycleTime(moves: Move[], deliveredList: string, createdAt?: Date) {
  const sorted = [...moves].sort((a, b) => a.movedAt.getTime() - b.movedAt.getTime());
  const first = sorted[0];
  if (first?.fromList && createdAt && createdAt < first.movedAt) {
    sorted.unshift({ toList: first.fromList, movedAt: createdAt });
  }
  let lastDelivery = -1;
  sorted.forEach((m, i) => {
    if (m.toList === deliveredList) lastDelivery = i;
  });
  if (lastDelivery === -1) return null;

  let building: number | null = null;
  let qa: number | null = null;
  for (let i = 0; i < lastDelivery; i++) {
    const days = workingDays(sorted[i].movedAt, sorted[i + 1].movedAt);
    if (sorted[i].toList === BUILD_LIST) building = (building ?? 0) + days;
    else if (sorted[i].toList === QA_LIST) qa = (qa ?? 0) + days;
  }
  return { building, qa };
}

export function median(values: number[]) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
