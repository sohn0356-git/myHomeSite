function Avatar({ photoDataUrl, fallback }) {
  if (photoDataUrl) {
    return <img className="avatarImg" src={photoDataUrl} alt="" />;
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
          const p = profiles[m.id] || {};
          return (
            <button
              key={m.id}
              type="button"
              className="personCard"
              onClick={() => onOpenDetail(m.id)}
            >
              <div className="personAvatar">
                <Avatar
                  photoDataUrl={p.photoDataUrl}
                  fallback={m.name.slice(0, 1)}
                />
              </div>
              <div className="personMeta">
                <div className="personName">{m.name}</div>
                <div className="personRole">{m.role}</div>
                <div className="personHint">
                  {p.note ? p.note : "인적사항 입력 가능"}
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
