import { fetchQaCards } from "@/lib/trello";
import { signFeedbackLink } from "@/lib/session";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export const dynamic = "force-dynamic";

export default async function QaPage() {
  let error: string | null = null;
  let cards: Awaited<ReturnType<typeof fetchQaCards>> = [];
  try {
    cards = await fetchQaCards();
  } catch (e) {
    error = e instanceof Error ? e.message : "Couldn't load cards from Trello.";
  }
  const links = await Promise.all(cards.map(async (c) => `/feedback/${c.id}/${await signFeedbackLink(c.id)}`));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="page-title-main mb-1">QA feedback</h1>
      <p className="breadcrumb mb-6">
        Cards in the In QA list, loaded live from Trello. Copy a task&rsquo;s message and paste it into the team chat, or send it to whoever should review
        it. Each submission is added to the card as a comment with the person&rsquo;s name. A link stops accepting
        feedback once its card leaves QA.
      </p>

      {error ? (
        <div className="card empty-state">
          <div className="empty-title">Couldn&rsquo;t load the QA list</div>
          <div className="empty-desc">{error}</div>
        </div>
      ) : cards.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-title">Nothing in QA</div>
          <div className="empty-desc">Cards moved to In QA on Trello will show up here.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Card</th>
                <th>Comments</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: "var(--sand-80)", fontWeight: "var(--weight-medium)" }}>{c.name}</td>
                  <td>
                    <span className={`pill pill-sm ${c.badges.comments > 0 ? "pill-blue" : "pill-default"}`}>
                      {c.badges.comments}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <a href={c.shortUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                        Open in Trello
                      </a>
                      <CopyLinkButton path={links[i]} cardName={c.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
