import { max, sql } from "drizzle-orm";
import { db } from "@/db";
import { cardMoves, deliveredTasks } from "@/db/schema";

type TrelloCard = { id: string; name: string };
type TrelloAction = {
  id: string;
  date: string;
  data: {
    card: { id: string };
    listBefore?: { id: string; name: string };
    listAfter?: { id: string; name: string };
  };
};

function auth() {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) throw new Error("TRELLO_API_KEY / TRELLO_TOKEN not set");
  return `key=${key}&token=${token}`;
}

async function fetchDeliveredCards(): Promise<TrelloCard[]> {
  const listId = process.env.TRELLO_DELIVERED_LIST_ID!;
  const res = await fetch(`https://api.trello.com/1/lists/${listId}/cards?${auth()}`);
  if (!res.ok) throw new Error(`Trello cards fetch failed: ${res.status}`);
  return res.json();
}

// List moves only, newest first, 1000 per page (Trello's max). Pages back until it
// overlaps what's already stored, so the first sync backfills the full history and
// later syncs fetch a single page.
async function fetchMoves(storedUpTo: Date | null): Promise<TrelloAction[]> {
  const boardId = process.env.TRELLO_BOARD_ID!;
  const moves: TrelloAction[] = [];
  let before = "";
  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `https://api.trello.com/1/boards/${boardId}/actions?filter=updateCard:idList&limit=1000${before}&${auth()}`
    );
    if (!res.ok) throw new Error(`Trello actions fetch failed: ${res.status}`);
    const batch: TrelloAction[] = await res.json();
    moves.push(...batch);
    const oldest = batch.at(-1);
    if (batch.length < 1000 || !oldest || (storedUpTo && new Date(oldest.date) <= storedUpTo)) break;
    before = `&before=${oldest.id}`;
  }
  return moves;
}

async function storeMoves(moves: TrelloAction[]) {
  const rows = moves
    .filter((m) => m.data.listAfter)
    .map((m) => ({
      actionId: m.id,
      trelloCardId: m.data.card.id,
      fromList: m.data.listBefore?.name ?? null,
      toList: m.data.listAfter!.name,
      toListId: m.data.listAfter!.id,
      movedAt: new Date(m.date),
    }));
  for (let i = 0; i < rows.length; i += 1000) {
    await db.insert(cardMoves).values(rows.slice(i, i + 1000)).onConflictDoNothing();
  }
}

// Trello returns actions newest-first, so the first match is the most recent move into Delivered.
function findDeliveredDate(cardId: string, actions: TrelloAction[], deliveredListId: string) {
  const match = actions.find(
    (a) => a.data.card.id === cardId && a.data.listAfter?.id === deliveredListId
  );
  return match?.date.slice(0, 10) ?? null;
}

// The board has legacy cards that predate the "Name - Task(points)" convention and
// contain stray " - " punctuation, so a bare split-on-first-delimiter misreads those
// titles as the assignee. Only accept the prefix if it's actually one of the team.
const KNOWN_ASSIGNEES = ["Nasib", "Andrew", "Himal"];

function parseAssignee(title: string) {
  const idx = title.indexOf(" - ");
  const prefix = idx === -1 ? title : title.slice(0, idx);
  const match = KNOWN_ASSIGNEES.find((name) => name.toLowerCase() === prefix.trim().toLowerCase());
  return match ?? "Unassigned";
}

function parsePoints(title: string) {
  const matches = [...title.matchAll(/\((\d+)\)/g)];
  if (matches.length === 0) return null;
  return Number(matches[matches.length - 1][1]);
}

export async function runTrelloSync() {
  const deliveredListId = process.env.TRELLO_DELIVERED_LIST_ID!;
  const [[{ storedUpTo }], cards] = await Promise.all([
    db.select({ storedUpTo: max(cardMoves.movedAt) }).from(cardMoves),
    fetchDeliveredCards(),
  ]);
  const actions = await fetchMoves(storedUpTo);
  await storeMoves(actions);

  const existing = await db.select({ trelloCardId: deliveredTasks.trelloCardId }).from(deliveredTasks);
  const existingIds = new Set(existing.map((r) => r.trelloCardId));

  const today = new Date().toISOString().slice(0, 10);
  const withDate: (typeof deliveredTasks.$inferInsert)[] = [];
  const withoutDate: (typeof deliveredTasks.$inferInsert)[] = [];

  for (const card of cards) {
    const foundDate = findDeliveredDate(card.id, actions, deliveredListId);
    // ponytail: today is only used on first insert (card added straight to the list,
    // no move-action to find); the update below never writes it over a stored date.
    (foundDate ? withDate : withoutDate).push({
      trelloCardId: card.id,
      name: card.name,
      assignee: parseAssignee(card.name),
      points: parsePoints(card.name),
      isBug: /\bbug/i.test(card.name),
      deliveredAt: foundDate ?? today,
    });
  }

  // Once history is stored, a sync only fetches the latest page of moves, so an older
  // delivery's move isn't in this run's list. Only refresh delivered_at when this run
  // actually found its move (and never once manually edited).
  // name/assignee/points are pure functions of the title, so they always refresh.
  // is_bug, severity and caused_by are manual-override fields and are never touched here.
  const upsert = (rows: typeof withDate, refreshDate: boolean) =>
    rows.length === 0
      ? Promise.resolve()
      : db
          .insert(deliveredTasks)
          .values(rows)
          .onConflictDoUpdate({
            target: deliveredTasks.trelloCardId,
            set: {
              name: sql`excluded.name`,
              assignee: sql`excluded.assignee`,
              points: sql`excluded.points`,
              syncedAt: sql`now()`,
              ...(refreshDate && {
                deliveredAt: sql`case when ${deliveredTasks.deliveredAtEdited} then ${deliveredTasks.deliveredAt} else excluded.delivered_at end`,
              }),
            },
          });

  await Promise.all([upsert(withDate, true), upsert(withoutDate, false)]);

  const newCount = cards.filter((c) => !existingIds.has(c.id)).length;
  return { new: newCount, updated: cards.length - newCount, total: cards.length };
}
