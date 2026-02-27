import { useEffect, useMemo, useState } from "react";

function Avatar({ photoUrl, fallback }) {
  if (photoUrl) return <img className="avatarImg" src={photoUrl} alt="" />;
  return <div className="avatarFallback">{fallback}</div>;
}

function GradePicker({ grade, onChange }) {
  const options = ["1", "2", "3"];
  return (
    <div className="gradePicker" role="tablist" aria-label="grade picker">
      {options.map((value) => (
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

export default function StudentsPage({
  grade,
  birthYearKey,
  classes,
  members,
  profiles,
  onChangeGrade,
  onCreateClass,
  onRemoveClass,
  onAddMember,
  onMoveMemberToClass,
  onRemoveMember,
  onOpenDetail,
}) {
  const [newClassName, setNewClassName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("학생");
  const [memberClassId, setMemberClassId] = useState(classes?.[0]?.id || "");
  const [formError, setFormError] = useState("");
  const [dragMemberId, setDragMemberId] = useState("");

  const classNameById = useMemo(
    () =>
      (classes || []).reduce((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    [classes]
  );

  const teachers = members.filter((m) => m.role === "선생님");
  const students = members.filter((m) => m.role === "학생");

  useEffect(() => {
    if (!memberClassId) return;
    if (classes.some((item) => item.id === memberClassId)) return;
    setMemberClassId("");
  }, [classes, memberClassId]);

  const addClass = () => {
    const result = onCreateClass(newClassName);
    if (!result?.ok) {
      setFormError(result?.error || "반을 생성하지 못했습니다.");
      return;
    }
    setFormError("");
    setNewClassName("");
  };

  const addMember = () => {
    const result = onAddMember({
      name: memberName,
      role: memberRole,
      classId: memberClassId,
    });
    if (!result?.ok) {
      setFormError(result?.error || "구성원을 추가하지 못했습니다.");
      return;
    }
    setFormError("");
    setMemberName("");
  };

  const onDropToClass = (classId) => {
    if (!dragMemberId) return;
    onMoveMemberToClass(dragMemberId, classId);
    setDragMemberId("");
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
          const className = classNameById[m.classId] || "";

          return (
            <div key={m.id} className="personCardWrap">
              <button
                type="button"
                className="personCard"
                draggable
                onDragStart={() => setDragMemberId(m.id)}
                onClick={() => onOpenDetail(m.id)}
              >
                <div className="personAvatar">
                  <Avatar photoUrl={photoUrl} fallback={m.name.slice(0, 1)} />
                </div>
                <div className="personMeta">
                  <div className="personName">{m.name}</div>
                  <div className="personRole">
                    {m.role}
                    {className ? ` · ${className}` : " · 반 미지정"}
                  </div>
                  <div className="personHint">
                    {m.role === "학생"
                      ? `학생 cohort key: ${birthYearKey}`
                      : profile.note || "메모를 입력해 주세요"}
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
        <div className="panelTitle">학년 선택</div>
        <GradePicker grade={grade} onChange={onChangeGrade} />
        <div className="hintSmall">
          {grade}학년 학생은 Firebase에서 `student/{birthYearKey}` 아래에 저장됩니다.
        </div>
      </section>

      <section className="heroCard">
        <div className="panelTitle">반 생성</div>
        <div className="manageGrid">
          <label className="field">
            <div className="fieldLabel">새 반 이름</div>
            <input
              className="fieldInput"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="예: 사랑반"
            />
          </label>

          <button type="button" className="secondary manageBtn" onClick={addClass}>
            반 생성
          </button>
        </div>

        <div className="classPills">
          {classes.length === 0 ? (
            <span className="hintSmall">등록된 반이 없습니다.</span>
          ) : (
            classes.map((item) => (
              <span key={item.id} className="classPill">
                {item.name}
                <button
                  type="button"
                  className="classPillRemove"
                  onClick={() => onRemoveClass(item.id)}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </section>

      <section className="heroCard">
        <div className="panelTitle">구성원 생성</div>
        <div className="manageGrid">
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
            <div className="fieldLabel">소속 반</div>
            <select
              className="fieldInput"
              value={memberClassId}
              onChange={(e) => setMemberClassId(e.target.value)}
            >
              <option value="">반 없음</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="secondary manageBtn" onClick={addMember}>
            구성원 생성
          </button>
        </div>

        {formError ? <div className="hintSmall">{formError}</div> : null}
      </section>

      <section className="heroCard">
        <div className="panelTitle">반 배정 보드</div>
        <div className="panelDesc">구성원 카드를 원하는 반 칸으로 옮겨 배정할 수 있습니다.</div>
        <div className="dndBoard">
          <div
            className="dndColumn"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropToClass("")}
          >
            <div className="dndTitle">반 미지정</div>
            <div className="dndList">
              {members
                .filter((m) => !m.classId)
                .map((m) => (
                  <div key={m.id} className="dndItem">
                    {m.name}
                  </div>
                ))}
            </div>
          </div>

          {classes.map((item) => (
            <div
              key={item.id}
              className="dndColumn"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropToClass(item.id)}
            >
              <div className="dndTitle">{item.name}</div>
              <div className="dndList">
                {members
                  .filter((m) => m.classId === item.id)
                  .map((m) => (
                    <div key={m.id} className="dndItem">
                      {m.name}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {renderGroup("선생님", teachers)}
      {renderGroup("학생", students)}
    </>
  );
}
