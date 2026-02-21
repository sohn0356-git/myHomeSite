import { useEffect, useMemo, useState } from "react";
import "./App.css";

import Header from "./components/Header";
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

  const presentCount = members.filter((m) => attendance[m.name]).length;
  const absentCount = members.length - presentCount;

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

  return (
    <div className="page">
      <div className="card">
        <Header presentCount={presentCount} absentCount={absentCount} />

        <WeekNavigator
          label={formatKoreanSunday(selectedSunday)}
          onPrev={handlePrevWeek}
          onNext={handleNextWeek}
        />

        <AttendanceActions
          onMarkAllPresent={() => handleMarkAll(true)}
          onMarkAllAbsent={() => handleMarkAll(false)}
        />

        <AttendanceTable
          members={members}
          attendance={attendance}
          onToggle={handleToggleAttendance}
        />

        <p className="footNote">
          저장 방식: 브라우저 localStorage (같은 브라우저에서 자동 유지)
        </p>
      </div>
    </div>
  );
}
