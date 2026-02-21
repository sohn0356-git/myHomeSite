import { useMemo, useState } from "react";
import "./App.css";

import TopBar from "./components/TopBar";
import AttendancePage from "./components/AttendancePage";
import AnnualPage from "./components/AnnualPage";
import StudentsPage from "./components/StudentsPage";
import StudentDetail from "./components/StudentDetail";
import SettingsPage from "./components/SettingsPage";

import { seedMembers } from "./data/seedMembers";
import { addDays, getSunday, weekKey } from "./utils/date";
import { loadState, saveState, resetState } from "./utils/storage";

function buildInitialState() {
  return {
    members: seedMembers,
    attendanceByWeek: {},
    profiles: {},
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [sunday, setSunday] = useState(getSunday());
  const [state, setState] = useState(() => loadState() || buildInitialState());

  const { members, attendanceByWeek, profiles } = state;

  const currentWeekKey = useMemo(() => weekKey(sunday), [sunday]);
  const attendanceMap = attendanceByWeek[currentWeekKey] || {};

  const [detailMemberId, setDetailMemberId] = useState(null);
  const detailMember = members.find((m) => m.id === detailMemberId) || null;

  const persist = (next) => {
    setState(next);
    saveState(next);
  };

  const setAttendanceForWeek = (nextMap) => {
    persist({
      ...state,
      attendanceByWeek: {
        ...attendanceByWeek,
        [currentWeekKey]: nextMap,
      },
    });
  };

  const onToggleAttendance = (memberId) => {
    setAttendanceForWeek({
      ...attendanceMap,
      [memberId]: !attendanceMap[memberId],
    });
  };

  const onMarkAll = (value) => {
    const next = {};
    members.forEach((m) => (next[m.id] = value));
    setAttendanceForWeek(next);
  };

  const onPrevWeek = () => setSunday((d) => addDays(d, -7));
  const onNextWeek = () => setSunday((d) => addDays(d, 7));

  const onChangeProfile = (memberId, profile) => {
    persist({
      ...state,
      profiles: {
        ...profiles,
        [memberId]: profile,
      },
    });
  };

  const onResetAll = () => {
    if (!confirm("전체 데이터를 초기화할까? (출석/인적사항 포함)")) return;
    resetState();
    const fresh = buildInitialState();
    persist(fresh);
    setDetailMemberId(null);
    setActiveTab("attendance");
  };

  const year = sunday.getFullYear();

  return (
    <div className="page">
      <div className="container">
        <TopBar
          title="우리반 출석부"
          subtitle="출석 · 연간 · 학생 · 설정"
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

        {activeTab === "settings" && <SettingsPage onResetAll={onResetAll} />}

        {detailMember && (
          <StudentDetail
            member={detailMember}
            profile={profiles[detailMember.id]}
            onChangeProfile={onChangeProfile}
            onClose={() => setDetailMemberId(null)}
          />
        )}

        <div className="footerHint">
          저장 위치: 현재 기기 브라우저(localStorage)
        </div>
      </div>
    </div>
  );
}
