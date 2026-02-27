import { useState } from "react";
import { avatarMap } from "../data/avatarMap";
import { getPatternAvatarDataUrl } from "../utils/avatarPattern";

export default function StudentDetail({
  member,
  profile,
  onChangeProfile,
  onUploadPhoto,
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
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
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
          {error ? <div className="hintSmall">{error}</div> : null}
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
    </div>
  );
}
