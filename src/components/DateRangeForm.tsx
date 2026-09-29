import Link from "next/link";

export function DateRangeForm({ from, to }: { from: string; to: string }) {
  return (
    <form action="/" method="get" className="flex flex-wrap items-end gap-3">
      <div className="input-group" style={{ width: "auto" }}>
        <label className="input-label" htmlFor="from" style={{ fontSize: "var(--font-size-xs)" }}>
          From
        </label>
        <input id="from" name="from" type="date" defaultValue={from} className="input" style={{ height: "var(--input-height-sm)" }} />
      </div>
      <div className="input-group" style={{ width: "auto" }}>
        <label className="input-label" htmlFor="to" style={{ fontSize: "var(--font-size-xs)" }}>
          To
        </label>
        <input id="to" name="to" type="date" defaultValue={to} className="input" style={{ height: "var(--input-height-sm)" }} />
      </div>
      <button type="submit" className="btn btn-secondary btn-sm">
        Apply
      </button>
      <Link href="/" className="btn btn-ghost btn-sm">
        This quarter
      </Link>
    </form>
  );
}
