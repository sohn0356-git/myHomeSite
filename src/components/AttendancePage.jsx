import { useEffect, useMemo, useState } from "react";
import { formatKoreanSunday } from "../utils/date";
import { avatarMap } from "../data/avatarMap";
import { getPatternAvatarDataUrl } from "../utils/avatarPattern";

function Avatar({ memberId, fallback, photoUrl }) {
  const src = photoUrl || avatarMap[memberId] || getPatternAvatarDataUrl(memberId);
  if (src) return <img className="avatarImg" src={src} alt="" />;
  return <div className="avatarFallback">{fallback}</div>;
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

export default function AttendancePage({
  grade,
  onChangeGrade,
  sunday,
  onPrevWeek,
  onNextWeek,
  members,
  profiles,
  attendanceMap,
  onToggle,
  onMarkAll,
}) {
  const [classFilter, setClassFilter] = useState("all");
  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .map((m) => (typeof m.className === "string" ? m.className.trim() : ""))
            .filter(Boolean)
        )
      ),
    [members]
  );
  useEffect(() => {
    if (classFilter === "all") return;
    if (classOptions.includes(classFilter)) return;
    setClassFilter("all");
  }, [classFilter, classOptions]);
  const visibleMembers =
    classFilter === "all"
      ? members
      : members.filter((m) => (m.className || "").trim() === classFilter);
  const present = visibleMembers.filter((m) => attendanceMap[m.id]).length;
  const absent = visibleMembers.length - present;

  return (
    <>
      <div className="heroCard">
        <GradePicker grade={grade} onChange={onChangeGrade} />

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
          <span>반 필터: {classFilter === "all" ? "전체" : `${classFilter}반`}</span>
          <span>출석 {present}명</span>
          <span>결석 {absent}명</span>
        </div>

        <label className="field">
          <div className="fieldLabel">반별 보기</div>
          <select
            className="fieldInput"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">전체</option>
            {classOptions.map((name) => (
              <option key={name} value={name}>
                {name}반
              </option>
            ))}
          </select>
        </label>

        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => onMarkAll(true, visibleMembers.map((m) => m.id))}
          >
            전체 출석
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => onMarkAll(false, visibleMembers.map((m) => m.id))}
          >
            전체 결석
          </button>
        </div>
      </div>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">명단</h2>
          <div className="sectionCount">{visibleMembers.length}명</div>
        </div>

        <div className="listCard">
          {visibleMembers.map((m) => {
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
