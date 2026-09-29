export function CapBar({ label, count, cap }: { label: string; count: number; cap: number }) {
  const over = count > cap;
  return (
    <div className="flex items-center justify-between" style={{ padding: ".625rem 0" }}>
      <span style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--weight-medium)", color: "var(--sand-70)" }}>
        {label}
      </span>
      <span className={`pill ${over ? "pill-red" : "pill-green"}`}>
        {count} / {cap}
      </span>
    </div>
  );
}
