export default function SyncPage({
  syncConfig,
  onUpdateSyncConfig,
  onSendAttendance,
  lastSyncResult,
}) {
  const update = (patch) => onUpdateSyncConfig({ ...syncConfig, ...patch });

  return (
    <div className="heroCard">
      <div className="panelTitle">Google Sheets 연동</div>
      <div className="panelDesc">
        Apps Script 웹앱 URL/토큰을 입력하면 “이번 주 출석”을 스프레드시트로
        전송 가능.
      </div>

      <div className="formGrid" style={{ marginTop: 10 }}>
        <label className="field fieldFull">
          <div className="fieldLabel">Apps Script Web App URL</div>
          <input
            className="fieldInput"
            value={syncConfig.webAppUrl || ""}
            onChange={(e) => update({ webAppUrl: e.target.value })}
            placeholder="https://script.google.com/macros/s/XXXX/exec"
          />
        </label>

        <label className="field fieldFull">
          <div className="fieldLabel">Token</div>
          <input
            className="fieldInput"
            value={syncConfig.token || ""}
            onChange={(e) => update({ token: e.target.value })}
            placeholder="예: my-attendance-secret-2026"
          />
        </label>
      </div>

      <div className="actions" style={{ marginTop: 10 }}>
        <button type="button" onClick={onSendAttendance}>
          이번 주 출석 전송
        </button>
      </div>

      {lastSyncResult && (
        <div className="syncResult">
          <div className="syncTitle">최근 전송 결과</div>
          <pre className="syncPre">
            {JSON.stringify(lastSyncResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
