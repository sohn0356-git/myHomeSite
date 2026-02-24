import { useEffect, useMemo, useState } from "react";
import "./App.css";

import TopBar from "./components/TopBar";
import AttendancePage from "./components/AttendancePage";
import AnnualPage from "./components/AnnualPage";
import StudentsPage from "./components/StudentsPage";
import StudentDetail from "./components/StudentDetail";

import { seedMembers } from "./data/seedMembers";
import { addDays, getSunday, weekKey } from "./utils/date";
import {
  deleteMemberPhotoByPath,
  ensureRemoteState,
  isFirebaseEnabled,
  loadState,
  saveState,
  subscribeRemoteState,
  uploadMemberPhoto,
} from "./utils/storage";

function buildInitialState() {
  return {
    className: "",
    members: seedMembers,
    attendanceByWeek: {},
    profiles: {},
  };
}

function createMemberId(role) {
  const prefix = role === "선생님" ? "t" : "s";
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [sunday, setSunday] = useState(getSunday());
  const [state, setState] = useState(() => loadState(seedMembers));
  const [syncMode, setSyncMode] = useState(
    isFirebaseEnabled() ? "firebase" : "local"
  );

  const { className, members, attendanceByWeek, profiles } = state;
  const currentWeekKey = useMemo(() => weekKey(sunday), [sunday]);
  const attendanceMap = attendanceByWeek[currentWeekKey] || {};

  const [detailMemberId, setDetailMemberId] = useState(null);
  const detailMember = members.find((m) => m.id === detailMemberId) || null;

  useEffect(() => {
    if (!isFirebaseEnabled()) return () => {};

    let detached = false;
    let unsubscribe = () => {};

    const startSync = async () => {
      try {
        await ensureRemoteState(buildInitialState());
        if (detached) return;

        unsubscribe = subscribeRemoteState((remoteState) => {
          setState(remoteState);
        });
        setSyncMode("firebase");
      } catch (err) {
        console.error("Firebase sync setup failed:", err);
        setSyncMode("local");
      }
    };

    startSync();

    return () => {
      detached = true;
      unsubscribe();
    };
  }, []);

  const persist = (next) => {
    setState(next);
    saveState(next).catch((err) => {
      console.error("State sync failed:", err);
    });
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

  const onSetClassName = (nextClassName) => {
    persist({
      ...state,
      className: nextClassName,
    });
  };

  const onAddMember = ({ name, role }) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const nextMember = {
      id: createMemberId(role),
      name: trimmedName,
      role,
    };

    persist({
      ...state,
      members: [...members, nextMember],
    });
  };

  const onRemoveMember = async (memberId) => {
    const removedProfile = profiles[memberId];

    const nextMembers = members.filter((m) => m.id !== memberId);
    const nextProfiles = { ...profiles };
    delete nextProfiles[memberId];

    const nextAttendanceByWeek = {};
    Object.entries(attendanceByWeek).forEach(([week, weekMap]) => {
      if (!weekMap || typeof weekMap !== "object") return;
      if (!Object.prototype.hasOwnProperty.call(weekMap, memberId)) {
        nextAttendanceByWeek[week] = weekMap;
        return;
      }

      const nextWeekMap = { ...weekMap };
      delete nextWeekMap[memberId];
      nextAttendanceByWeek[week] = nextWeekMap;
    });

    if (detailMemberId === memberId) {
      setDetailMemberId(null);
    }

    persist({
      ...state,
      members: nextMembers,
      profiles: nextProfiles,
      attendanceByWeek: nextAttendanceByWeek,
    });

    if (removedProfile?.photoPath) {
      try {
        await deleteMemberPhotoByPath(removedProfile.photoPath);
      } catch (err) {
        console.warn("Failed to delete photo file:", err);
      }
    }
  };

  const onUploadPhoto = async (memberId, file) => {
    const result = await uploadMemberPhoto(memberId, file);
    const prevPath = profiles[memberId]?.photoPath;

    if (prevPath && prevPath !== result.path) {
      try {
        await deleteMemberPhotoByPath(prevPath);
      } catch (err) {
        console.warn("Failed to delete old photo file:", err);
      }
    }

    const nextProfile = {
      ...(profiles[memberId] || {}),
      photoPath: result.path,
      photoUrl: result.url,
    };

    onChangeProfile(memberId, nextProfile);
    return result.url;
  };

  const onRemovePhoto = async (memberId) => {
    const prevPath = profiles[memberId]?.photoPath;
    if (prevPath) {
      try {
        await deleteMemberPhotoByPath(prevPath);
      } catch (err) {
        console.warn("Failed to delete photo file:", err);
      }
    }

    const prev = profiles[memberId] || {};
    const nextProfile = { ...prev };
    delete nextProfile.photoPath;
    delete nextProfile.photoUrl;
    delete nextProfile.photoDataUrl;
    onChangeProfile(memberId, nextProfile);
  };

  const year = sunday.getFullYear();
  const appTitle = className ? `${className} 출석부` : "출석부";

  return (
    <div className="page">
      <div className="container">
        <TopBar
          title={appTitle}
          subtitle="출석 / 연간 / 학생 관리"
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
            profiles={profiles}
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
            className={className}
            members={members}
            profiles={profiles}
            onSetClassName={onSetClassName}
            onAddMember={onAddMember}
            onRemoveMember={onRemoveMember}
            onOpenDetail={(id) => setDetailMemberId(id)}
          />
        )}

        {detailMember && (
          <StudentDetail
            member={detailMember}
            profile={profiles[detailMember.id]}
            onChangeProfile={onChangeProfile}
            onUploadPhoto={onUploadPhoto}
            onRemovePhoto={onRemovePhoto}
            firebaseEnabled={isFirebaseEnabled()}
            onClose={() => setDetailMemberId(null)}
          />
        )}

        <div className="footerHint">
          동기화: {syncMode === "firebase" ? "Firebase Realtime DB" : "로컬 저장"}
        </div>
      </div>
    </div>
  );
}
