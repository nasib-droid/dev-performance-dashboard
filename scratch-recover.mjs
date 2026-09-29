import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const KEY = process.env.TRELLO_API_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
const BOARD = process.env.TRELLO_BOARD_ID;
const LIST = process.env.TRELLO_DELIVERED_LIST_ID;

async function fetchPage(before) {
  const url = `https://api.trello.com/1/boards/${BOARD}/actions?filter=updateCard&limit=1000&key=${KEY}&token=${TOKEN}` + (before ? `&before=${before}` : "");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`actions fetch failed: ${res.status}`);
  return res.json();
}

const affected = await sql`select id, trello_card_id, name from delivered_tasks where delivered_at = current_date and delivered_at_edited = false`;
console.log(`Recovering true dates for ${affected.length} rows...`);

const remaining = new Set(affected.map(r => r.trello_card_id));
const foundDates = new Map(); // trelloCardId -> date

let before = undefined;
let page = 0;
const MAX_PAGES = 20;

while (remaining.size > 0 && page < MAX_PAGES) {
  const actions = await fetchPage(before);
  if (actions.length === 0) break;
  for (const a of actions) {
    const cardId = a.data?.card?.id;
    if (cardId && remaining.has(cardId) && a.data?.listAfter?.id === LIST && !foundDates.has(cardId)) {
      foundDates.set(cardId, a.date.slice(0, 10));
      remaining.delete(cardId);
    }
  }
  before = actions[actions.length - 1].id;
  page++;
  console.log(`page ${page}: fetched ${actions.length} actions, ${remaining.size} cards still unresolved`);
}

console.log(`\nRecovered ${foundDates.size} of ${affected.length}. Still unresolved: ${remaining.size}`);

for (const row of affected) {
  const trueDate = foundDates.get(row.trello_card_id);
  if (trueDate) {
    await sql`update delivered_tasks set delivered_at = ${trueDate} where id = ${row.id}`;
    console.log(`fixed: ${row.name} -> ${trueDate}`);
  }
}

if (remaining.size > 0) {
  console.log("\nCould not recover a true date for these (kept at today, likely added directly to the list):");
  for (const row of affected) {
    if (remaining.has(row.trello_card_id)) console.log(` - ${row.name}`);
  }
}
