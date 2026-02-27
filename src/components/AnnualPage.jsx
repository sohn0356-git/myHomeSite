import { useMemo, useState } from "react";

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

function getLatestSundayOfYear(year, today = new Date()) {
  const endOfYear = new Date(year, 11, 31);
  const isPastYear = today.getFullYear() > year;
  const isFutureYear = today.getFullYear() < year;
  const latestBase = isFutureYear ? null : isPastYear ? endOfYear : today;
  if (!latestBase) return null;

  const d = new Date(latestBase);
  d.setDate(d.getDate() - d.getDay());
  if (isPastYear) return endOfYear;
  return d.getFullYear() === year ? d : null;
}

function isMonthStart(sundays, idx) {
  if (idx === 0) return true;
  return sundays[idx - 1].getMonth() !== sundays[idx].getMonth();
}

function GradePicker({ grade, onChange }) {
  return (
    <div className="gradePicker" role="tablist" aria-label="grade picker">
      {["1", "2", "3"].map((value) => (
        <button
          key={value}
          type="button"
          className={`gradeBtn ${grade === value ? "gradeBtnActive" : ""}`}
          onClick={() => onChange(value)}
        >
          {value}학년
        </button>
      ))}
    </div>
  );
}

export default function AnnualPage({
  year,
  grade,
  onChangeGrade,
  classes,
  members,
  attendanceByWeek,
}) {
  const [classFilter, setClassFilter] = useState("all");
  const sundays = useMemo(() => getAllSundaysOfYear(year), [year]);
  const latestSunday = useMemo(() => getLatestSundayOfYear(year), [year]);
  const latestIndex = useMemo(
    () =>
      latestSunday
        ? sundays.findIndex((d) => toYMD(d) === toYMD(latestSunday))
        : -1,
    [latestSunday, sundays]
  );
  const totalWeeksUntilLatest = latestIndex >= 0 ? latestIndex + 1 : 0;
  const classNameById = useMemo(
    () =>
      classes.reduce((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    [classes]
  );
  const classOptions = useMemo(
    () => Array.from(new Set(members.map((m) => m.className).filter(Boolean))),
    [members]
  );
  const visibleMembers =
    classFilter === "all"
      ? members
      : members.filter((m) => (m.className || "") === classFilter);

  const matrix = useMemo(() => {
    const map = {};
    for (const m of visibleMembers) map[m.id] = [];

    sundays.forEach((date) => {
      const key = `attendance-${toYMD(date)}`;
      const weekData = attendanceByWeek?.[key] || {};

      visibleMembers.forEach((m) => {
        const has = Object.prototype.hasOwnProperty.call(weekData, m.id);
        map[m.id].push(has ? !!weekData[m.id] : null);
      });
    });

    return map;
  }, [attendanceByWeek, visibleMembers, sundays]);

  const summary = useMemo(() => {
    const perMember = {};
    visibleMembers.forEach((m) => {
      let present = 0;

      (matrix[m.id] || []).forEach((v, idx) => {
        if (idx > latestIndex) return;
        if (v === true) present += 1;
      });

      perMember[m.id] = {
        present,
        absent: Math.max(totalWeeksUntilLatest - present, 0),
        totalWeeksUntilLatest,
        pct: totalWeeksUntilLatest
          ? Math.round((present / totalWeeksUntilLatest) * 1000) / 10
          : 0,
      };
    });
    return perMember;
  }, [latestIndex, matrix, visibleMembers, totalWeeksUntilLatest]);

  return (
    <>
      <div className="heroCard">
        <GradePicker grade={grade} onChange={onChangeGrade} />
        <div className="panelTitle">연간 출석</div>
        <div className="miniSummary">
          <span>주차 {sundays.length}</span>
          <span>조회 {visibleMembers.length}명</span>
          <span>기준 주차 {totalWeeksUntilLatest}주</span>
        </div>
        <label className="field">
          <div className="fieldLabel">반 선택</div>
          <select
            className="fieldInput"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">전체</option>
            {classOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
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
              {visibleMembers.map((m) => {
                const row = matrix[m.id] || [];
                const s = summary[m.id];

                return (
                  <tr key={m.id}>
                    <td className="stickyCol nameCell">
                      <div className="nameCellInner">
                        <span className="nameText">{m.name}</span>
                        <span className="personRole">
                          {classNameById[m.classId] || "반 미지정"}
                        </span>
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
                      title={`출석 ${s.present} / 기준 주차 ${s.totalWeeksUntilLatest}, 결석 ${s.absent}`}
                    >
                      <div className="sumCellInner">
                        <div className="pct">{s.pct}%</div>
                        <div className="sub">
                          {s.present}/{s.totalWeeksUntilLatest}
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
