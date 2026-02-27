import Tabs from "./Tabs";

export default function TopBar({
  title,
  subtitle,
  activeTab,
  onChangeTab,
  groupLabel,
  onLogout,
}) {
  return (
    <header className="topBar">
      <div className="topBarLeft">
        <div className="topTitle">{title}</div>
        {subtitle ? <div className="topSub">{subtitle}</div> : null}
        {groupLabel ? <div className="topSub">{groupLabel}</div> : null}
      </div>

      <div className="topBarRight">
        <Tabs active={activeTab} onChange={onChangeTab} />
        {onLogout ? (
          <button type="button" className="secondary topActionBtn" onClick={onLogout}>
            로그아웃
          </button>
        ) : null}
        <div className="brandDot" aria-hidden="true" />
      </div>
    </header>
  );
}
