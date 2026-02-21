export default function WeekNavigator({ label, onPrev, onNext }) {
  return (
    <div className="weekBar">
      <button onClick={onPrev}>← 이전 주</button>
      <div className="weekText">{label}</div>
      <button onClick={onNext}>다음 주 →</button>
    </div>
  );
}
