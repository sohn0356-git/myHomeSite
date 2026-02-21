export default function SettingsPage({ onResetAll, onExport, onImport }) {
  return (
    <div className="heroCard">
      <div className="panelTitle">설정</div>
      <div className="panelDesc">
        데이터는 현재 브라우저에 저장됨(localStorage).
      </div>

      <div className="actions" style={{ marginTop: 10 }}>
        <button type="button" className="secondary" onClick={onExport}>
          백업(JSON 다운로드)
        </button>

        <label className="fileBtn secondary">
          복원(JSON 업로드)
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={onImport}
          />
        </label>

        <button type="button" onClick={onResetAll} className="dangerBtn">
          전체 데이터 초기화
        </button>
      </div>

      <div className="hintSmall" style={{ marginTop: 10 }}>
        ※ “초기화”는 출석/프로필/연동 설정까지 모두 삭제.
      </div>
    </div>
  );
}
