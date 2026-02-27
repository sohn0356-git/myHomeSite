import { formatKoreanSunday } from "../utils/date";
import { avatarMap } from "../data/avatarMap";

function Avatar({ memberId, fallback, photoUrl }) {
  const src = photoUrl || avatarMap[memberId];
  if (src) return <img className="avatarImg" src={src} alt="" />;
  return <div className="avatarFallback">{fallback}</div>;
}

export default function AttendancePage({
  sunday,
  onPrevWeek,
  onNextWeek,
  members,
  profiles,
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
            이전 주
          </button>

          <div className="weekText" title={formatKoreanSunday(sunday)}>
            {formatKoreanSunday(sunday)}
          </div>

          <button type="button" onClick={onNextWeek} className="secondary">
            다음 주
          </button>
        </div>

        <div className="miniSummary">
          <span>출석 {present}명</span>
          <span>결석 {absent}명</span>
        </div>

        <div className="actions">
          <button type="button" className="secondary" onClick={() => onMarkAll(true)}>
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
            const profile = profiles[m.id] || {};
            const photoUrl = profile.photoUrl || profile.photoDataUrl;

            return (
              <div key={m.id} className="memberRow">
                <div className="memberLeft">
                  <div className="miniAvatar">
                    <Avatar
                      memberId={m.id}
                      fallback={m.name.slice(0, 1)}
                      photoUrl={photoUrl}
                    />
                  </div>

                  <div
                    className={`pill ${
                      m.role === "선생님" ? "pillTeacher" : "pillStudent"
                    }`}
                  >
                    {m.role}
                  </div>

                  <div className="memberName">{m.name}</div>
                  {m.className ? (
                    <div className="personRole" style={{ marginTop: 0 }}>
                      {m.className}반
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={`toggle ${checked ? "toggleOn" : "toggleOff"}`}
                  onClick={() => onToggle(m.id)}
                  aria-pressed={checked}
                >
                  <span className="toggleDot" />
                  <span className="toggleText">{checked ? "출석" : "결석"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
