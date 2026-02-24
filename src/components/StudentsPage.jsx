import { useState } from "react";

function Avatar({ photoUrl, fallback }) {
  if (photoUrl) return <img className="avatarImg" src={photoUrl} alt="" />;
  return <div className="avatarFallback">{fallback}</div>;
}

export default function StudentsPage({
  className,
  members,
  profiles,
  onSetClassName,
  onAddMember,
  onRemoveMember,
  onOpenDetail,
}) {
  const [nextClassName, setNextClassName] = useState(className || "");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("학생");

  const teachers = members.filter((m) => m.role === "선생님");
  const students = members.filter((m) => m.role === "학생");

  const saveClassName = () => {
    onSetClassName(nextClassName.trim());
  };

  const addMember = () => {
    const trimmed = memberName.trim();
    if (!trimmed) return;
    onAddMember({ name: trimmed, role: memberRole });
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
                  <div className="personRole">{m.role}</div>
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
        <div className="panelTitle">반/구성원 관리</div>
        <div className="manageGrid">
          <label className="field">
            <div className="fieldLabel">반 이름</div>
            <input
              className="fieldInput"
              value={nextClassName}
              onChange={(e) => setNextClassName(e.target.value)}
              placeholder="예: 유년부 2반"
            />
          </label>
          <button type="button" className="secondary manageBtn" onClick={saveClassName}>
            반 이름 저장
          </button>

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
