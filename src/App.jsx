import { useMemo, useState } from "react";
import "./App.css";

import TopBar from "./components/TopBar";
import AttendancePage from "./components/AttendancePage";
import AnnualPage from "./components/AnnualPage";
import StudentsPage from "./components/StudentsPage";
import StudentDetail from "./components/StudentDetail";

import { seedMembers } from "./data/seedMembers";
import { addDays, getSunday, weekKey } from "./utils/date";
import { loadState, saveState } from "./utils/storage";

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
    members.forEach((m) => {
      next[m.id] = value;
    });
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

  const year = sunday.getFullYear();

  return (
    <div className="page">
      <div className="container">
        <TopBar
          title="Attendance Board"
          subtitle="Attendance / Annual / Students"
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
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

        {detailMember && (
          <StudentDetail
            member={detailMember}
            profile={profiles[detailMember.id]}
            onChangeProfile={onChangeProfile}
            onClose={() => setDetailMemberId(null)}
          />
        )}

        <div className="footerHint">Data is stored in this device localStorage.</div>
      </div>
    </div>
  );
}
