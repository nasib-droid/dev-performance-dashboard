type Group = { label: string; singular: string; tasks: { id: number; name: string }[] };

export function NeedsAttention({ groups }: { groups: Group[] }) {
  const open = groups.filter((g) => g.tasks.length > 0);
  if (open.length === 0) return null;

  return (
    <details className="body-small" style={{ marginTop: ".25rem" }}>
      <summary style={{ cursor: "pointer", color: "var(--ember-60)" }}>
        Needs attention: {open.map((g) => `${g.tasks.length} ${g.tasks.length === 1 ? g.singular : g.label}`).join(" · ")}
      </summary>
      <div style={{ marginTop: ".5rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
        {open.map((g) => (
          <div key={g.label}>
            <div style={{ color: "var(--sand-70)", fontWeight: "var(--weight-medium)" }}>{g.label}</div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", listStyle: "disc" }}>
              {g.tasks.map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
