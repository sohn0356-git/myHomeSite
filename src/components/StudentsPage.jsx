import { useEffect, useMemo, useState } from "react";

function Avatar({ photoUrl, fallback }) {
  if (photoUrl) return <img className="avatarImg" src={photoUrl} alt="" />;
  return <div className="avatarFallback">{fallback}</div>;
}

function parseClassNames(text) {
  return text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function StudentsPage({
  grade,
  birthYearKey,
  classNames,
  members,
  profiles,
  onChangeGrade,
  onSetClassConfig,
  onAddMember,
  onRemoveMember,
  onOpenDetail,
}) {
  const [classNamesInput, setClassNamesInput] = useState(
    (classNames || []).join(", ")
  );
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("학생");
  const [memberClassName, setMemberClassName] = useState(classNames?.[0] || "");

  const teachers = members.filter((m) => m.role === "선생님");
  const students = members.filter((m) => m.role === "학생");
  const classOptions = useMemo(
    () => parseClassNames(classNamesInput),
    [classNamesInput]
  );

  useEffect(() => {
    setClassNamesInput((classNames || []).join(", "));
  }, [classNames]);

  const saveClassConfig = () => {
    const parsedClassNames = parseClassNames(classNamesInput);
    onSetClassConfig({
      classNames: parsedClassNames,
    });

    if (!parsedClassNames.includes(memberClassName)) {
      setMemberClassName(parsedClassNames[0] || "");
    }
  };

  const addMember = () => {
    const trimmed = memberName.trim();
    if (!trimmed) return;
    onAddMember({
      name: trimmed,
      role: memberRole,
      className: memberClassName,
    });
    setMemberName("");
  };

  const renderGroup = (title, list) => (
    <section className="section">
      <div className="sectionHeader">
        <h2 className="sectionTitle">{title}</h2>
        <div className="sectionCount">{list.length}명</div>
      </div>

      <div className="gridCard">
        {list.map((m) => {
          const profile = profiles[m.id] || {};
          const photoUrl = profile.photoUrl || profile.photoDataUrl;

          return (
            <div key={m.id} className="personCardWrap">
              <button
                type="button"
                className="personCard"
                onClick={() => onOpenDetail(m.id)}
              >
                <div className="personAvatar">
                  <Avatar photoUrl={photoUrl} fallback={m.name.slice(0, 1)} />
                </div>
                <div className="personMeta">
                  <div className="personName">{m.name}</div>
                  <div className="personRole">
                    {m.role}
                    {m.className ? ` · ${m.className}반` : ""}
                  </div>
                  <div className="personHint">
                    {profile.note ? profile.note : "메모를 입력해 주세요"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="memberRemove"
                onClick={() => onRemoveMember(m.id)}
              >
                제거
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <>
      <section className="heroCard">
        <div className="panelTitle">학년/반/구성원 관리</div>
        <div className="manageGrid">
          <label className="field">
            <div className="fieldLabel">학년</div>
            <select
              className="fieldInput"
              value={grade}
              onChange={(e) => onChangeGrade(e.target.value)}
            >
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </label>

          <label className="field">
            <div className="fieldLabel">반 목록(쉼표 구분)</div>
            <input
              className="fieldInput"
              value={classNamesInput}
              onChange={(e) => setClassNamesInput(e.target.value)}
              placeholder="예: 사랑반, 소망반, 믿음반"
            />
          </label>

          <button
            type="button"
            className="secondary manageBtn"
            onClick={saveClassConfig}
          >
            반 목록 저장
          </button>

          <div className="hintSmall">
            Firebase 저장 key: {birthYearKey || "미지정"} (예: 2026년 1학년=2010)
          </div>

          <label className="field">
            <div className="fieldLabel">이름</div>
            <input
              className="fieldInput"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="이름 입력"
            />
          </label>

          <label className="field">
            <div className="fieldLabel">역할</div>
            <select
              className="fieldInput"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
            >
              <option value="학생">학생</option>
              <option value="선생님">선생님</option>
            </select>
          </label>

          <label className="field">
            <div className="fieldLabel">반</div>
            <select
              className="fieldInput"
              value={memberClassName}
              onChange={(e) => setMemberClassName(e.target.value)}
            >
              <option value="">반 없음</option>
              {classOptions.map((item) => (
                <option key={item} value={item}>
                  {item}반
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="secondary manageBtn" onClick={addMember}>
            구성원 추가
          </button>
        </div>
      </section>

      {renderGroup("선생님", teachers)}
      {renderGroup("학생", students)}
    </>
  );
}
