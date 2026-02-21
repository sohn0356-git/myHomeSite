import { useMemo, useState } from "react";
import { avatarMap } from "../data/avatarMap";

function getYearFromKey(key) {
  const date = key.replace("attendance-", "");
  return Number(date.slice(0, 4));
}
function getMonthFromDateStr(dateStr) {
  return Number(dateStr.slice(5, 7));
}
function buildYearIndex(attendanceByWeek, year) {
  const items = Object.keys(attendanceByWeek || {})
    .filter((k) => k.startsWith("attendance-") && getYearFromKey(k) === year)
    .map((k) => ({ key: k, date: k.replace("attendance-", "") }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byMonth = new Map();
  for (const it of items) {
    const m = getMonthFromDateStr(it.date);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(it);
  }
  return { items, byMonth };
}
function rate(present, total) {
  if (!total) return 0;
  return Math.round((present / total) * 1000) / 10;
}

export default function AnnualPage({ year, members, attendanceByWeek }) {
  const [selectedId, setSelectedId] = useState(members?.[0]?.id || "");

  const index = useMemo(
    () => buildYearIndex(attendanceByWeek, year),
    [attendanceByWeek, year]
  );
  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedId) || members[0],
    [members, selectedId]
  );

  const summary = useMemo(() => {
    let total = 0;
    let present = 0;

    for (const it of index.items) {
      const map = attendanceByWeek[it.key] || {};
      if (selectedMember?.id) {
        if (Object.prototype.hasOwnProperty.call(map, selectedMember.id)) {
          total += 1;
          if (map[selectedMember.id]) present += 1;
        }
      }
    }
    return {
      total,
      present,
      absent: Math.max(0, total - present),
      pct: rate(present, total),
    };
  }, [attendanceByWeek, index.items, selectedMember]);

  const avatar = selectedMember ? avatarMap[selectedMember.id] : null;

  return (
    <>
      <div className="heroCard">
        <div className="panelTitle">연간 출석</div>
        <div className="panelDesc">
          {year}년 기준 · 사람을 선택하면 주차별 출석이 월별로 정리됨 (로컬 저장
          데이터 기반)
        </div>

        <div className="annualHeader">
          <div className="annualAvatar">
            {avatar ? (
              <img className="avatarImg" src={avatar} alt="" />
            ) : (
              <div className="avatarFallback">?</div>
            )}
          </div>
          <div className="annualHeaderText">
            <div className="annualName">
              {selectedMember?.name}{" "}
              <span className="annualRole">({selectedMember?.role})</span>
            </div>
            <div className="miniSummary" style={{ marginTop: 8 }}>
              <span>출석 {summary.present}회</span>
              <span>결석 {summary.absent}회</span>
              <span>출석률 {summary.pct}%</span>
            </div>
          </div>
        </div>

        <div className="chipRow" style={{ marginTop: 10 }}>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`chip ${
                m.id === selectedMember?.id ? "chipActive" : ""
              }`}
              onClick={() => setSelectedId(m.id)}
            >
              <span
                className={`chipRole ${
                  m.role === "선생님" ? "roleTeacher" : "roleStudent"
                }`}
              >
                {m.role}
              </span>
              <span className="chipName">{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">월별 기록</h2>
          <div className="sectionCount">
            {index.items.length}주(저장된 주차)
          </div>
        </div>

        {index.items.length === 0 ? (
          <div className="heroCard">
            <div className="panelDesc">
              아직 {year}년에 저장된 출석 데이터가 없음.
            </div>
          </div>
        ) : (
          <div className="monthGrid">
            {Array.from(index.byMonth.keys())
              .sort((a, b) => a - b)
              .map((month) => {
                const weeks = index.byMonth.get(month) || [];
                return (
                  <div key={month} className="monthCard">
                    <div className="monthTitle">{month}월</div>

                    <div className="weekDots">
                      {weeks.map((w) => {
                        const map = attendanceByWeek[w.key] || {};
                        const has = Object.prototype.hasOwnProperty.call(
                          map,
                          selectedMember.id
                        );
                        const on = has ? !!map[selectedMember.id] : null;

                        return (
                          <div
                            key={w.key}
                            className="dotWrap"
                            title={`${w.date} (일)`}
                          >
                            <div
                              className={`dot ${
                                on === true
                                  ? "dotOn"
                                  : on === false
                                  ? "dotOff"
                                  : "dotNone"
                              }`}
                            />
                            <div className="dotLabel">
                              {w.date.slice(8, 10)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="monthHint">
                      <span className="legend">
                        <i className="dot dotOn" /> 출석
                      </span>
                      <span className="legend">
                        <i className="dot dotOff" /> 결석
                      </span>
                      <span className="legend">
                        <i className="dot dotNone" /> 기록없음
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </>
  );
}
