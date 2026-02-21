import { useMemo } from "react";
import { formatDate } from "../utils/date";

function buildYearJson({ year, members, attendanceByWeek }) {
  const keys = Object.keys(attendanceByWeek || {})
    .filter((k) => k.startsWith("attendance-"))
    .map((k) => ({ key: k, date: k.replace("attendance-", "") }))
    .filter((x) => Number(x.date.slice(0, 4)) === year)
    .sort((a, b) => a.date.localeCompare(b.date));

  const weeks = keys.map(({ key, date }) => {
    const map = attendanceByWeek[key] || {};
    const records = members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      status: map[m.id] ? "출석" : "결석",
    }));
    return { sunday: date, records };
  });

  return { year, weeks };
}

export default function AnnualPage({ year, members, attendanceByWeek }) {
  const annualJson = useMemo(
    () => buildYearJson({ year, members, attendanceByWeek }),
    [year, members, attendanceByWeek]
  );

  const weekSummaries = useMemo(() => {
    return annualJson.weeks.map((w) => {
      const present = w.records.filter((r) => r.status === "출석").length;
      return {
        sunday: w.sunday,
        present,
        absent: w.records.length - present,
      };
    });
  }, [annualJson]);

  const onDownload = () => {
    const blob = new Blob([JSON.stringify(annualJson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="heroCard">
        <div className="panelTitle">연간 출석부</div>
        <div className="panelDesc">
          {year}년 주일 출석 기록을 JSON으로 묶어 표시. (아래에서 다운로드 가능)
        </div>

        <div className="actions" style={{ marginTop: 8 }}>
          <button type="button" onClick={onDownload}>
            {year}년 JSON 다운로드
          </button>
        </div>
      </div>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">{year}년 주차 목록</h2>
          <div className="sectionCount">{weekSummaries.length}주</div>
        </div>

        {weekSummaries.length === 0 ? (
          <div className="heroCard">
            <div className="panelDesc">
              아직 {year}년에 저장된 출석 데이터가 없음.
            </div>
          </div>
        ) : (
          <div className="weekGrid">
            {weekSummaries.map((w) => (
              <div key={w.sunday} className="weekCard">
                <div className="weekCardTop">
                  <div className="weekCardTitle">{w.sunday} (일)</div>
                  <div className="weekCardBadge">
                    {w.present}/{w.present + w.absent}
                  </div>
                </div>
                <div className="weekCardBars">
                  <div className="barLine">
                    <div className="barLabel">출석</div>
                    <div className="barValue good">{w.present}명</div>
                  </div>
                  <div className="barLine">
                    <div className="barLabel">결석</div>
                    <div className="barValue bad">{w.absent}명</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">JSON 미리보기</h2>
          <div className="sectionCount">read-only</div>
        </div>

        <div className="jsonCard">
          <pre className="jsonPre">{JSON.stringify(annualJson, null, 2)}</pre>
        </div>
      </section>
    </>
  );
}
