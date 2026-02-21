import { useEffect, useMemo, useState } from "react";
import "./App.css";

import TopBar from "./components/TopBar";
import WeekNavigator from "./components/WeekNavigator";
import AttendanceActions from "./components/AttendanceActions";
import AttendanceTable from "./components/AttendanceTable";

import { members } from "./data/members";
import { formatKoreanSunday, getSunday, getWeekKey } from "./utils/date";

function createInitialAttendance() {
  return members.reduce((acc, member) => {
    acc[member.name] = false;
    return acc;
  }, {});
}

export default function App() {
  const [selectedSunday, setSelectedSunday] = useState(getSunday());
  const [attendance, setAttendance] = useState(createInitialAttendance());

  const weekKey = useMemo(() => getWeekKey(selectedSunday), [selectedSunday]);

  useEffect(() => {
    const saved = localStorage.getItem(weekKey);
    if (saved) {
      setAttendance(JSON.parse(saved));
    } else {
      setAttendance(createInitialAttendance());
    }
  }, [weekKey]);

  useEffect(() => {
    localStorage.setItem(weekKey, JSON.stringify(attendance));
  }, [attendance, weekKey]);

  const handleToggleAttendance = (name) => {
    setAttendance((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handlePrevWeek = () => {
    const prev = new Date(selectedSunday);
    prev.setDate(prev.getDate() - 7);
    setSelectedSunday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedSunday);
    next.setDate(next.getDate() + 7);
    setSelectedSunday(next);
  };

  const handleMarkAll = (value) => {
    const updated = members.reduce((acc, member) => {
      acc[member.name] = value;
      return acc;
    }, {});
    setAttendance(updated);
  };

  const presentCount = members.filter((m) => attendance[m.name]).length;
  const absentCount = members.length - presentCount;

  return (
    <div className="page">
      <div className="container">
        <TopBar title="주일 출석체크" subtitle="매주 일요일 · 반 출석 관리" />

        <div className="heroCard">
          <WeekNavigator
            label={formatKoreanSunday(selectedSunday)}
            onPrev={handlePrevWeek}
            onNext={handleNextWeek}
          />

          <div className="miniSummary">
            <span>출석 {presentCount}명</span>
            <span>결석 {absentCount}명</span>
          </div>

          <AttendanceActions
            onMarkAllPresent={() => handleMarkAll(true)}
            onMarkAllAbsent={() => handleMarkAll(false)}
          />
        </div>

        <AttendanceTable
          members={members}
          attendance={attendance}
          onToggle={handleToggleAttendance}
        />

        <div className="footerHint">
          데이터는 현재 브라우저에 자동 저장됨 (localStorage)
        </div>
      </div>
    </div>
  );
}