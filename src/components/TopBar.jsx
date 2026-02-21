export default function TopBar({ title, subtitle }) {
  return (
    <header className="topBar">
      <div>
        <div className="topTitle">{title}</div>
        <div className="topSub">{subtitle}</div>
      </div>
      <div className="brandDot" aria-hidden="true" />
    </header>
  );
}