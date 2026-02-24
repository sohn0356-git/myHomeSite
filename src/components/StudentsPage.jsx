function Avatar({ photoUrl, fallback }) {
  if (photoUrl) {
    return <img className="avatarImg" src={photoUrl} alt="" />;
  }
  return <div className="avatarFallback">{fallback}</div>;
}

export default function StudentsPage({ members, profiles, onOpenDetail }) {
  const teachers = members.filter((m) => m.role === "선생님");
  const students = members.filter((m) => m.role === "학생");

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
            <button
              key={m.id}
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
          );
        })}
      </div>
    </section>
  );

  return (
    <>
      {renderGroup("선생님", teachers)}
      {renderGroup("학생", students)}
    </>
  );
}
