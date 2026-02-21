import { addDays, formatKoreanSunday } from "../utils/date";

export default function AttendancePage({
  sunday,
  onPrevWeek,
  onNextWeek,
  members,
  attendanceMap,
  onToggle,
  onMarkAll,
}) {
  const present = members.filter((m) => attendanceMap[m.id]).length;
  const absent = members.length - present;

  return (
    <>
      <div className="heroCard">
        <div className="weekBar">
          <button type="button" onClick={onPrevWeek} className="secondary">
            ← 이전 주
          </button>

          <div className="weekText" title={formatKoreanSunday(sunday)}>
            {formatKoreanSunday(sunday)}
          </div>

          <button type="button" onClick={onNextWeek} className="secondary">
            다음 주 →
          </button>
        </div>

        <div className="miniSummary">
          <span>출석 {present}명</span>
          <span>결석 {absent}명</span>
        </div>

        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => onMarkAll(true)}
          >
            전체 출석
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => onMarkAll(false)}
          >
            전체 결석
          </button>
        </div>
      </div>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">명단</h2>
          <div className="sectionCount">{members.length}명</div>
        </div>

        <div className="listCard">
          {members.map((m) => {
            const checked = !!attendanceMap[m.id];
            return (
              <div key={m.id} className="memberRow">
                <div className="memberLeft">
                  <div
                    className={`pill ${
                      m.role === "선생님" ? "pillTeacher" : "pillStudent"
                    }`}
                  >
                    {m.role}
                  </div>
                  <div className="memberName">{m.name}</div>
                </div>

                <button
                  type="button"
                  className={`toggle ${checked ? "toggleOn" : "toggleOff"}`}
                  onClick={() => onToggle(m.id)}
                  aria-pressed={checked}
                >
                  <span className="toggleDot" />
                  <span className="toggleText">
                    {checked ? "출석" : "결석"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
