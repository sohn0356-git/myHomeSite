import { useMemo, useRef } from "react";

export default function StudentDetail({
  member,
  profile,
  onChangeProfile,
  onClose,
}) {
  const fileRef = useRef(null);

  const safeProfile = profile || {};
  const title = useMemo(() => `${member.role} · ${member.name}`, [member]);

  const update = (patch) =>
    onChangeProfile(member.id, { ...safeProfile, ...patch });

  const onPickPhoto = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // MVP: 그대로 DataURL 저장 (용량 이슈 있으면 다음 단계에서 리사이즈/압축 붙이자)
    const reader = new FileReader();
    reader.onload = () => {
      update({ photoDataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modalCard">
        <div className="modalTop">
          <div>
            <div className="modalTitle">{title}</div>
            <div className="modalSub">프로필 / 인적사항</div>
          </div>
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="profileRow">
          <div className="profilePhoto">
            {safeProfile.photoDataUrl ? (
              <img
                className="profilePhotoImg"
                src={safeProfile.photoDataUrl}
                alt=""
              />
            ) : (
              <div className="profilePhotoFallback">
                {member.name.slice(0, 1)}
              </div>
            )}
          </div>

          <div className="profileActions">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onFileChange}
            />
            <button type="button" onClick={onPickPhoto}>
              사진 업로드
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => update({ photoDataUrl: "" })}
            >
              사진 제거
            </button>
            <div className="hintSmall">
              ※ 사진은 현재 브라우저에 저장됨(로컬). 용량이 크면 저장이 실패할
              수 있음.
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
              placeholder="예: 알레르기, 출석 패턴, 관심사, 기도제목 등"
              rows={5}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
