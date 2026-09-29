import { desc } from "drizzle-orm";
import { db } from "@/db";
import { codeAudits } from "@/db/schema";
import { createAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AuditsPage() {
  const audits = await db.select().from(codeAudits).orderBy(desc(codeAudits.auditDate));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="page-title-main mb-6">Log a code audit</h1>

      <form action={createAudit} className="card mb-10">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="input-group">
            <label className="input-label" htmlFor="auditDate">
              Date
            </label>
            <input
              id="auditDate"
              name="auditDate"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="input"
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="majorCount">
              Major count
            </label>
            <input id="majorCount" name="majorCount" type="number" min={0} required defaultValue={0} className="input" />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="minorCount">
              Minor count
            </label>
            <input id="minorCount" name="minorCount" type="number" min={0} required defaultValue={0} className="input" />
          </div>
        </div>
        <div className="input-group mb-5">
          <label className="input-label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={3} className="input" />
        </div>
        <button type="submit" className="btn btn-primary">
          Save audit
        </button>
      </form>

      <h2 className="heading-3 mb-4">Past audits</h2>
      {audits.length === 0 ? (
        <div className="card empty-state">
          <svg className="empty-icon" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="8" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M6 18h36" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 10v4M32 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <div className="empty-title">No audits logged yet</div>
          <div className="empty-desc">Entries you save above will show up here.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Major</th>
                <th>Minor</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id}>
                  <td style={{ color: "var(--sand-80)", fontWeight: "var(--weight-medium)" }}>{a.auditDate}</td>
                  <td>
                    <span className={`pill pill-sm ${a.majorCount > 1 ? "pill-red" : "pill-default"}`}>{a.majorCount}</span>
                  </td>
                  <td>
                    <span className={`pill pill-sm ${a.minorCount > 3 ? "pill-orange" : "pill-default"}`}>{a.minorCount}</span>
                  </td>
                  <td>{a.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
