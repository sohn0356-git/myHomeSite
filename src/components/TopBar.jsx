export default function TopBar({ title, subtitle, activeTab, onChangeTab }) {
  const tabs = [
    { key: "attendance", label: "출석" },
    { key: "history", label: "기록" },
    { key: "settings", label: "설정" },
  ];

  return (
    <header className="topBar">
      <div className="topBarLeft">
        <div className="topTitle">{title}</div>
        <div className="topSub">{subtitle}</div>
      </div>

      <div className="topBarRight">
        <nav className="tabs" role="tablist" aria-label="header tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tabBtn ${activeTab === t.key ? "tabActive" : ""}`}
              onClick={() => onChangeTab(t.key)}
              role="tab"
              aria-selected={activeTab === t.key}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="brandDot" aria-hidden="true" />
      </div>
    </header>
  );
}
