function RoleBadge({ role }) {
  return (
    <span className={`badge ${role === "선생님" ? "teacher" : "student"}`}>
      {role}
    </span>
  );
}

function AttendanceRow({ index, member, checked, onToggle }) {
  return (
    <tr>
      <td>{index + 1}</td>
      <td>{member.name}</td>
      <td>
        <RoleBadge role={member.role} />
      </td>
      <td>
        <label className="checkLabel">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(member.name)}
          />
          <span>{checked ? "출석" : "결석"}</span>
        </label>
      </td>
    </tr>
  );
}

export default function AttendanceTable({ members, attendance, onToggle }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: "60px" }}>번호</th>
            <th>이름</th>
            <th style={{ width: "100px" }}>구분</th>
            <th style={{ width: "120px" }}>출석</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, idx) => (
            <AttendanceRow
              key={member.name}
              index={idx}
              member={member}
              checked={!!attendance[member.name]}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
