import { useState } from "react";
import { avatarMap } from "../data/avatarMap";
import { getPatternAvatarDataUrl } from "../utils/avatarPattern";

export default function StudentDetail({
  member,
  profile,
  onChangeProfile,
  onUploadPhoto,
  onDeleteMember,
  firebaseEnabled,
  onClose,
}) {
  const [error, setError] = useState("");

  const safeProfile = profile || {};
  const avatar =
    safeProfile.photoUrl ||
    safeProfile.photoDataUrl ||
    avatarMap[member.id] ||
    getPatternAvatarDataUrl(member.id, member.role);

  const update = (patch) => {
    onChangeProfile(member.id, { ...safeProfile, ...patch });
  };

  const handleDelete = async () => {
    const ok = window.confirm(`${member.name} 구성원을 삭제할까요?`);
    if (!ok) return;
    await onDeleteMember(member.id);
    onClose();
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    if (!firebaseEnabled) {
      setError("Firebase 설정 후 사진 업로드를 사용할 수 있습니다.");
      return;
    }

    try {
      await onUploadPhoto(member.id, file);
    } catch (err) {
      setError("사진 업로드에 실패했습니다.");
    }
  };

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modalCard">
        <div className="modalTop">
          <div>
            <div className="modalTitle">{member.role} · {member.name}</div>
            <div className="modalSub">프로필 / 인적사항</div>
          </div>
          <div className="modalTopActions">
            <button type="button" className="dangerBtn" onClick={handleDelete}>
              삭제
            </button>
            <button type="button" className="secondary" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>

        <div className="profileRow">
          <label className="profilePhotoSmall profilePhotoClick">
            {avatar ? (
              <img className="profilePhotoImg" src={avatar} alt="" />
            ) : (
              <div className="profilePhotoFallback">{member.name.slice(0, 1)}</div>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
          </label>
          <div className="quickFields">
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

            <label className="field">
              <div className="fieldLabel">생년월일</div>
              <input
                type="date"
                className="fieldInput"
                value={safeProfile.birthDate || ""}
                onChange={(e) => update({ birthDate: e.target.value })}
              />
            </label>
          </div>
        </div>

        {error ? <div className="hintSmall">{error}</div> : null}

        <div className="formGrid">
          <label className="field fieldFull">
            <div className="fieldLabel">특이사항 메모</div>
            <textarea
              className="fieldTextarea"
              value={safeProfile.note || ""}
              onChange={(e) => update({ note: e.target.value })}
              placeholder="알레르기, 복용약, 참고사항 등을 입력"
              rows={4}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
