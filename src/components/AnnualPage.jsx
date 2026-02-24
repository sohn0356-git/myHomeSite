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

function getAllSundaysOfYear(year) {
  const d = new Date(year, 0, 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);

  const list = [];
  while (d.getFullYear() === year) {
    list.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return list;
}

function isMonthStart(sundays, idx) {
  if (idx === 0) return true;
  return sundays[idx - 1].getMonth() !== sundays[idx].getMonth();
}

export default function AnnualPage({ year, members, attendanceByWeek }) {
  const sundays = useMemo(() => getAllSundaysOfYear(year), [year]);

  const matrix = useMemo(() => {
    const map = {};
    for (const m of members) map[m.id] = [];

    sundays.forEach((date) => {
      const key = `attendance-${toYMD(date)}`;
      const weekData = attendanceByWeek?.[key] || {};

      members.forEach((m) => {
        const has = Object.prototype.hasOwnProperty.call(weekData, m.id);
        map[m.id].push(has ? !!weekData[m.id] : null);
      });
    });

    return map;
  }, [attendanceByWeek, members, sundays]);

  const summary = useMemo(() => {
    const perMember = {};
    members.forEach((m) => {
      let recorded = 0;
      let present = 0;

      (matrix[m.id] || []).forEach((v) => {
        if (v === null) return;
        recorded += 1;
        if (v === true) present += 1;
      });

      perMember[m.id] = {
        present,
        absent: recorded - present,
        recorded,
        pct: recorded ? Math.round((present / recorded) * 1000) / 10 : 0,
      };
    });
    return perMember;
  }, [members, matrix]);

  return (
    <>
      <div className="heroCard">
        <div className="panelTitle">연간 출석</div>
        <div className="panelDesc">
          출석은 <b>O</b>, 결석은 <b>X</b>, 미기록은 <b>·</b>로 표시됩니다.
        </div>
        <div className="miniSummary">
          <span>주차 {sundays.length}</span>
          <span>인원 {members.length}명</span>
          <span>컴팩트 보기 적용</span>
        </div>
      </div>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">연간 출석표</h2>
          <div className="sectionCount">{year}</div>
        </div>

        <div className="annualTableWrap">
          <table className="annualTable annualCompact">
            <thead>
              <tr>
                <th className="stickyCol stickyHead nameHead">이름</th>
                {sundays.map((d, idx) => {
                  const ymd = toYMD(d);
                  const monthStart = isMonthStart(sundays, idx);
                  return (
                    <th
                      key={ymd}
                      className={`stickyHead dateHead ${
                        monthStart ? "monthStart" : ""
                      }`}
                      title={ymd}
                    >
                      <span className="dateMM">{pad2(d.getMonth() + 1)}</span>
                      <span className="dateDD">{pad2(d.getDate())}</span>
                    </th>
                  );
                })}
                <th className="stickyHead sumHead" title="출석률 / 출석 횟수">
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
                        <span className="nameText">{m.name}</span>
                      </div>
                    </td>

                    {row.map((v, idx) => {
                      const ymd = toYMD(sundays[idx]);
                      const monthStart = isMonthStart(sundays, idx);
                      const stateClass =
                        v === true ? "cellOn" : v === false ? "cellOff" : "cellNone";
                      const mark = v === true ? "O" : v === false ? "X" : "·";
                      const stateText =
                        v === true ? "출석" : v === false ? "결석" : "미기록";

                      return (
                        <td
                          key={`${m.id}-${ymd}`}
                          className={`cellTd ${monthStart ? "monthStart" : ""}`}
                          title={`${ymd} ${stateText}`}
                        >
                          <span className={`cellMark ${stateClass}`}>{mark}</span>
                        </td>
                      );
                    })}

                    <td
                      className="sumCell"
                      title={`출석 ${s.present} / 기록 ${s.recorded}, 결석 ${s.absent}`}
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
            <i className="legendSwatch cellOn" /> O 출석
          </span>
          <span className="legendItem">
            <i className="legendSwatch cellOff" /> X 결석
          </span>
          <span className="legendItem">
            <i className="legendSwatch cellNone" /> · 미기록
          </span>
        </div>
      </section>
    </>
  );
}
