export default function AttendanceActions({
  onMarkAllPresent,
  onMarkAllAbsent,
}) {
  return (
    <div className="actions">
      <button className="secondary" onClick={onMarkAllPresent}>
        전체 출석
      </button>
      <button className="secondary" onClick={onMarkAllAbsent}>
        전체 결석
      </button>
    </div>
  );
}
