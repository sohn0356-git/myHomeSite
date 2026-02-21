import { useMemo, useState } from "react";
import "./App.css";

import TopBar from "./components/TopBar";
import AttendancePage from "./components/AttendancePage";
import AnnualPage from "./components/AnnualPage";
import StudentsPage from "./components/StudentsPage";
import StudentDetail from "./components/StudentDetail";
import SyncPage from "./components/SyncPage";
import SettingsPage from "./components/SettingsPage";

import { seedMembers } from "./data/seedMembers";
import { addDays, getSunday, weekKey, formatDate } from "./utils/date";
import { loadState, saveState, resetState } from "./utils/storage";

function buildInitialState() {
  return {
    members: seedMembers,
    attendanceByWeek: {}, // { [weekKey]: { [memberId]: boolean } }
    profiles: {}, // { [memberId]: { phone, guardianPhone, note, photoDataUrl } }
    syncConfig: { webAppUrl: "", token: "" },
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [sunday, setSunday] = useState(getSunday());

  const [state, setState] = useState(() => loadState() || buildInitialState());
  const { members, attendanceByWeek, profiles, syncConfig } = state;

  const currentWeekKey = useMemo(() => weekKey(sunday), [sunday]);
  const attendanceMap = attendanceByWeek[currentWeekKey] || {};

  const [detailMemberId, setDetailMemberId] = useState(null);
  const detailMember = members.find((m) => m.id === detailMemberId) || null;

  const persist = (next) => {
    setState(next);
    saveState(next);
  };

  const setAttendanceForWeek = (nextMap) => {
    const next = {
      ...state,
      attendanceByWeek: {
        ...attendanceByWeek,
        [currentWeekKey]: nextMap,
      },
    };
    persist(next);
  };

  const onToggleAttendance = (memberId) => {
    setAttendanceForWeek({
      ...attendanceMap,
      [memberId]: !attendanceMap[memberId],
    });
  };

  const onMarkAll = (value) => {
    const next = {};
    members.forEach((m) => {
      next[m.id] = value;
    });
    setAttendanceForWeek(next);
  };

  const onPrevWeek = () => setSunday((d) => addDays(d, -7));
  const onNextWeek = () => setSunday((d) => addDays(d, 7));

  const onChangeProfile = (memberId, profile) => {
    const next = {
      ...state,
      profiles: {
        ...profiles,
        [memberId]: profile,
      },
    };
    persist(next);
  };

  // ------- Sync (Apps Script) -------
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const onUpdateSyncConfig = (nextCfg) => {
    const next = { ...state, syncConfig: nextCfg };
    persist(next);
  };

  const onSendAttendance = async () => {
    try {
      if (!syncConfig.webAppUrl || !syncConfig.token) {
        alert("연동 탭에서 Web App URL과 Token을 먼저 입력해줘.");
        return;
      }

      const sundayDate = formatDate(sunday);

      const rows = members.map((m) => ({
        주일날짜: sundayDate,
        이름: m.name,
        구분: m.role,
        출석여부: attendanceMap[m.id] ? "출석" : "결석",
      }));

      const payload = { token: syncConfig.token, rows };

      const res = await fetch(syncConfig.webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLastSyncResult(data);

      if (!data.ok) alert(`전송 실패: ${data.error || "unknown error"}`);
      else alert(`전송 완료! (추가 ${data.inserted} / 수정 ${data.updated})`);
    } catch (e) {
      console.error(e);
      alert(`전송 중 오류: ${e.message}`);
    }
  };

  // ------- Settings -------
  const onResetAll = () => {
    if (!confirm("전체 데이터를 초기화할까? (출석/프로필/연동 포함)")) return;
    resetState();
    const fresh = buildInitialState();
    setState(fresh);
    saveState(fresh);
    setDetailMemberId(null);
    setActiveTab("attendance");
    alert("초기화 완료");
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "class-site-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (
        !imported.members ||
        !imported.attendanceByWeek ||
        !imported.profiles
      ) {
        throw new Error("백업 파일 형식이 올바르지 않음");
      }

      persist(imported);
      alert("복원 완료");
    } catch (err) {
      alert(`복원 실패: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  };

  const year = sunday.getFullYear();

  return (
    <div className="page">
      <div className="container">
        <TopBar
          title="우리반 출석부"
          subtitle="출석 · 연간 · 학생 · 연동 · 설정"
          activeTab={activeTab}
          onChangeTab={(t) => {
            setActiveTab(t);
            setDetailMemberId(null);
          }}
        />

        {activeTab === "attendance" && (
          <AttendancePage
            sunday={sunday}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
            members={members}
            attendanceMap={attendanceMap}
            onToggle={onToggleAttendance}
            onMarkAll={onMarkAll}
            profiles={profiles}
          />
        )}

        {activeTab === "annual" && (
          <AnnualPage
            year={year}
            members={members}
            attendanceByWeek={attendanceByWeek}
          />
        )}

        {activeTab === "students" && (
          <StudentsPage
            members={members}
            profiles={profiles}
            onOpenDetail={(id) => setDetailMemberId(id)}
          />
        )}

        {activeTab === "sync" && (
          <SyncPage
            syncConfig={syncConfig}
            onUpdateSyncConfig={onUpdateSyncConfig}
            onSendAttendance={onSendAttendance}
            lastSyncResult={lastSyncResult}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPage
            onResetAll={onResetAll}
            onExport={onExport}
            onImport={onImport}
          />
        )}

        {detailMember && (
          <StudentDetail
            member={detailMember}
            profile={profiles[detailMember.id]}
            onChangeProfile={onChangeProfile}
            onClose={() => setDetailMemberId(null)}
          />
        )}

        <div className="footerHint">
          데이터 저장: 이 브라우저(localStorage). 연간 탭에서 JSON 다운로드
          가능.
        </div>
      </div>
    </div>
  );
}
