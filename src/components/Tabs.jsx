export default function Tabs({ active, onChange }) {
  const tabs = [
    { key: "attendance", label: "출석" },
    { key: "students", label: "학생" },
    { key: "sync", label: "연동" },
    { key: "settings", label: "설정" },
  ];

  return (
    <nav className="tabs" role="tablist" aria-label="header tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`tabBtn ${active === t.key ? "tabActive" : ""}`}
          onClick={() => onChange(t.key)}
          role="tab"
          aria-selected={active === t.key}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
