export default function Header({ presentCount, absentCount }) {
  return (
    <header className="header">
      <div>
        <h1>주일 출석체크</h1>
        <p className="sub">매주 일요일 출석표</p>
      </div>

      <div className="summary">
        <span>출석 {presentCount}명</span>
        <span>결석 {absentCount}명</span>
      </div>
    </header>
  );
}
