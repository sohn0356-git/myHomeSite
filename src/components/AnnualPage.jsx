import { useMemo } from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

// ✅ 해당 연도의 "모든 주일" 리스트 만들기
function getAllSundaysOfYear(year) {
  // 1/1부터 시작해서 첫 번째 일요일 찾기
  const d = new Date(year, 0, 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);

  const list = [];
  while (d.getFullYear() === year) {
    list.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return list;
}

export default function AnnualPage({ year, members, attendanceByWeek }) {
  const sundays = useMemo(() => getAllSundaysOfYear(year), [year]);

  // attendanceByWeek 키가 "attendance-YYYY-MM-DD" 라는 전제
  const matrix = useMemo(() => {
    // { [memberId]: boolean[] } 형태로 변환
    const map = {};
    for (const m of members) map[m.id] = [];

    sundays.forEach((date) => {
      const ymd = toYMD(date);
      const key = `attendance-${ymd}`;
      const weekData = attendanceByWeek?.[key] || {};

      members.forEach((m) => {
        // 기록이 없으면 null, 기록이 있으면 true/false
        const has = Object.prototype.hasOwnProperty.call(weekData, m.id);
        map[m.id].push(has ? !!weekData[m.id] : null);
      });
    });

    return map;
  }, [attendanceByWeek, members, sundays]);

  const summary = useMemo(() => {
    const perMember = {};
    members.forEach((m) => {
      let totalRecorded = 0;
      let present = 0;

      const arr = matrix[m.id] || [];
      arr.forEach((v) => {
        if (v === null) return;
        totalRecorded += 1;
        if (v === true) present += 1;
      });

      perMember[m.id] = {
        present,
        absent: totalRecorded - present,
        recorded: totalRecorded,
        pct: totalRecorded
          ? Math.round((present / totalRecorded) * 1000) / 10
          : 0,
      };
    });
    return perMember;
  }, [members, matrix]);

  return (
    <>
      <div className="heroCard">
        <div className="panelTitle">연간 출석</div>
        <div className="panelDesc">
          {year}년의 <b>모든 주일</b>을 표시. 저장된 주차는 출석/결석으로
          표시되고, 체크하지 않은 주차는 “—”로 표시됨.
        </div>

        <div className="miniSummary">
          <span>주일 수 {sundays.length}회</span>
          <span>사람 {members.length}명</span>
          <span>표는 가로 스크롤 가능</span>
        </div>
      </div>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">연간 출석표</h2>
          <div className="sectionCount">{year}</div>
        </div>

        <div className="annualTableWrap">
          <table className="annualTable">
            <thead>
              <tr>
                <th className="stickyCol stickyHead nameHead">이름</th>
                {sundays.map((d) => {
                  const ymd = toYMD(d);
                  // 월/일만 짧게
                  const label = `${pad2(d.getMonth() + 1)}/${pad2(
                    d.getDate()
                  )}`;
                  return (
                    <th key={ymd} className="stickyHead dateHead" title={ymd}>
                      {label}
                    </th>
                  );
                })}
                <th
                  className="stickyHead sumHead"
                  title="저장된 주차 기준 출석률"
                >
                  출석률
                </th>
              </tr>
            </thead>

            <tbody>
              {members.map((m) => {
                const row = matrix[m.id] || [];
                const s = summary[m.id];

                return (
                  <tr key={m.id}>
                    <td className="stickyCol nameCell">
                      <div className="nameCellInner">
                        <span
                          className={`pill ${
                            m.role === "선생님" ? "pillTeacher" : "pillStudent"
                          }`}
                        >
                          {m.role}
                        </span>
                        <span className="nameText">{m.name}</span>
                      </div>
                    </td>

                    {row.map((v, idx) => {
                      const ymd = toYMD(sundays[idx]);
                      if (v === true) {
                        return (
                          <td
                            key={`${m.id}-${ymd}`}
                            className="cell cellOn"
                            title={`${ymd} 출석`}
                          />
                        );
                      }
                      if (v === false) {
                        return (
                          <td
                            key={`${m.id}-${ymd}`}
                            className="cell cellOff"
                            title={`${ymd} 결석`}
                          />
                        );
                      }
                      return (
                        <td
                          key={`${m.id}-${ymd}`}
                          className="cell cellNone"
                          title={`${ymd} 기록없음`}
                        />
                      );
                    })}

                    <td
                      className="sumCell"
                      title={`출석 ${s.present} / 기록 ${s.recorded}`}
                    >
                      <div className="sumCellInner">
                        <div className="pct">{s.pct}%</div>
                        <div className="sub">
                          {s.present}/{s.recorded}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="annualLegend">
          <span className="legendItem">
            <i className="legendSwatch cellOn" /> 출석
          </span>
          <span className="legendItem">
            <i className="legendSwatch cellOff" /> 결석
          </span>
          <span className="legendItem">
            <i className="legendSwatch cellNone" /> 기록없음
          </span>
        </div>
      </section>
    </>
  );
}
