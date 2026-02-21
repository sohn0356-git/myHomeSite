import { avatarMap } from "../data/avatarMap";

export default function StudentDetail({
  member,
  profile,
  onChangeProfile,
  onClose,
}) {
  const safeProfile = profile || {};
  const avatar = avatarMap[member.id];

  const update = (patch) =>
    onChangeProfile(member.id, { ...safeProfile, ...patch });

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modalCard">
        <div className="modalTop">
          <div>
            <div className="modalTitle">
              {member.role} · {member.name}
            </div>
            <div className="modalSub">프로필 / 인적사항</div>
          </div>
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="profileRow">
          <div className="profilePhotoSmall">
            {avatar ? (
              <img className="profilePhotoImg" src={avatar} alt="" />
            ) : (
              <div className="profilePhotoFallback">
                {member.name.slice(0, 1)}
              </div>
            )}
          </div>

          <div className="profileActions">
            <div className="hintSmall">
              현재는 <b>assets에 넣은 고정 아바타</b>를 사용. (Firebase 추가 시
              업로드로 확장 가능)
            </div>
          </div>
        </div>

        <div className="formGrid">
          <label className="field">
            <div className="fieldLabel">전화번호</div>
            <input
              className="fieldInput"
              value={safeProfile.phone || ""}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="010-0000-0000"
            />
          </label>

          <label className="field">
            <div className="fieldLabel">보호자 연락처</div>
            <input
              className="fieldInput"
              value={safeProfile.guardianPhone || ""}
              onChange={(e) => update({ guardianPhone: e.target.value })}
              placeholder="010-0000-0000"
            />
          </label>

          <label className="field fieldFull">
            <div className="fieldLabel">메모 / 특이사항</div>
            <textarea
              className="fieldTextarea"
              value={safeProfile.note || ""}
              onChange={(e) => update({ note: e.target.value })}
              placeholder="예: 알레르기, 관심사, 기도제목 등"
              rows={5}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
