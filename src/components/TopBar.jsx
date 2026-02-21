import Tabs from "./Tabs";

export default function TopBar({ title, subtitle, activeTab, onChangeTab }) {
  return (
    <header className="topBar">
      <div className="topBarLeft">
        <div className="topTitle">{title}</div>
        <div className="topSub">{subtitle}</div>
      </div>

      <div className="topBarRight">
        <Tabs active={activeTab} onChange={onChangeTab} />
        <div className="brandDot" aria-hidden="true" />
      </div>
    </header>
  );
}
