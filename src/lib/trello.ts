import { sql } from "drizzle-orm";
import { db } from "@/db";
import { deliveredTasks } from "@/db/schema";

type TrelloCard = { id: string; name: string };
type TrelloAction = {
  date: string;
  data: { card: { id: string }; listAfter?: { id: string } };
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

async function fetchUpdateCardActions(): Promise<TrelloAction[]> {
  const boardId = process.env.TRELLO_BOARD_ID!;
  // limit=1000 (Trello's max) so older deliveries aren't missed on a busy board
  const res = await fetch(
    `https://api.trello.com/1/boards/${boardId}/actions?filter=updateCard&limit=1000&${auth()}`
  );
  if (!res.ok) throw new Error(`Trello actions fetch failed: ${res.status}`);
  return res.json();
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
  const [cards, actions] = await Promise.all([fetchDeliveredCards(), fetchUpdateCardActions()]);

  const existing = await db.select({ trelloCardId: deliveredTasks.trelloCardId }).from(deliveredTasks);
  const existingIds = new Set(existing.map((r) => r.trelloCardId));

  let newCount = 0;
  let updatedCount = 0;

  for (const card of cards) {
    const assignee = parseAssignee(card.name);
    const points = parsePoints(card.name);
    const isBug = /bug/i.test(card.name);
    const foundDate = findDeliveredDate(card.id, actions, deliveredListId);
    // ponytail: fall back to today only for the initial insert (e.g. card added
    // directly to the list, with no move-action to find). This value is never used
    // again after that — see the update guard below.
    const deliveredAt = foundDate ?? new Date().toISOString().slice(0, 10);

    // The actions lookup only sees the most recent 1000 board-wide updateCard events,
    // so an older delivery's move-action can silently fall outside that window on a
    // later sync even though a previous sync found it correctly. Only touch the stored
    // delivered_at when this run actually found real history for it — otherwise leave
    // whatever's already there alone instead of clobbering a correct date with today's
    // fallback. (Once someone manually edits it, deliveredAtEdited protects it too.)
    //
    // assignee, unlike delivered_at, is a pure function of the title with no external
    // lookback window and no manual-override UI, so it's always safe to refresh — this
    // is what lets a card fixed by an earlier parsing bug self-heal on the next sync
    // instead of staying stuck on whatever was parsed at insert time.
    const updateSet: Record<string, unknown> = { name: card.name, assignee, points, syncedAt: new Date() };
    if (foundDate) {
      updateSet.deliveredAt = sql`case when ${deliveredTasks.deliveredAtEdited} then ${deliveredTasks.deliveredAt} else ${foundDate} end`;
    }

    await db
      .insert(deliveredTasks)
      .values({ trelloCardId: card.id, name: card.name, assignee, points, isBug, deliveredAt })
      .onConflictDoUpdate({
        target: deliveredTasks.trelloCardId,
        set: updateSet,
      });

    if (existingIds.has(card.id)) updatedCount++;
    else newCount++;
  }

  return { new: newCount, updated: updatedCount, total: cards.length };
}
