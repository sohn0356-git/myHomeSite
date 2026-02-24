export default function Tabs({ active, onChange }) {
  const tabs = [
    { key: "attendance", label: "출석" },
    { key: "annual", label: "연간" },
    { key: "students", label: "학생" },
  ];

  return (
    <nav className="tabs" role="tablist" aria-label="header tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`tabBtn ${active === tab.key ? "tabActive" : ""}`}
          onClick={() => onChange(tab.key)}
          role="tab"
          aria-selected={active === tab.key}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
