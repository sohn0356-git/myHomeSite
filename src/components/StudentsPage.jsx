import { useEffect, useState } from "react";
import { avatarMap } from "../data/avatarMap";
import { getPatternAvatarDataUrl } from "../utils/avatarPattern";

function Avatar({ member, photoUrl }) {
  const src =
    photoUrl || avatarMap[member.id] || getPatternAvatarDataUrl(member.id, member.role);
  if (src) return <img className="avatarImg" src={src} alt="" />;
  return <div className="avatarFallback">{member.name.slice(0, 1)}</div>;
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

  const renderMemberCard = (member) => {
    const profile = profiles[member.id] || {};
    const photoUrl = profile.photoUrl || profile.photoDataUrl;

    const removeMember = (event) => {
      event.stopPropagation();
      const ok = window.confirm(`${member.name} 구성원을 삭제할까요?`);
      if (!ok) return;
      onRemoveMember(member.id);
    };

    return (
      <div key={member.id} className="boardCardWrap">
        <div
          role="button"
          tabIndex={0}
          className={`personCard boardPersonCard ${
            member.role === "선생님" ? "personTeacher" : "personStudent"
          }`}
          draggable
          onDragStart={() => setDragMemberId(member.id)}
          onClick={() => onOpenDetail(member.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenDetail(member.id);
            }
          }}
        >
          <span className="personShape personShapeA" aria-hidden="true" />
          <span className="personShape personShapeB" aria-hidden="true" />
          <button
            type="button"
            className="cardTrashBtn"
            onClick={removeMember}
            aria-label={`${member.name} 삭제`}
            title="삭제"
          >
            🗑
          </button>
          <div className="personAvatar">
            <Avatar member={member} photoUrl={photoUrl} />
          </div>
          <div className="personMeta">
            <div className="personName">{member.name}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="heroCard">
        <div className="panelTitle">학년 선택</div>
        <GradePicker grade={grade} onChange={onChangeGrade} />
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
        <div className="dndBoard">
          <div
            className="dndColumn"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropToClass("")}
          >
            <div className="dndTitle">반 미지정</div>
            <div className="dndList">
              {members.filter((m) => !m.classId).map(renderMemberCard)}
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
                {members.filter((m) => m.classId === item.id).map(renderMemberCard)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
