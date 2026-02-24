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
    members: seedMembers,
    attendanceByWeek: {},
    profiles: {},
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [sunday, setSunday] = useState(getSunday());
  const [state, setState] = useState(() => loadState(seedMembers));
  const [syncMode, setSyncMode] = useState(
    isFirebaseEnabled() ? "firebase" : "local"
  );

  const { members, attendanceByWeek, profiles } = state;
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
            onUploadPhoto={onUploadPhoto}
            onRemovePhoto={onRemovePhoto}
            firebaseEnabled={isFirebaseEnabled()}
            onClose={() => setDetailMemberId(null)}
          />
        )}

        <div className="footerHint">
          Sync mode: {syncMode === "firebase" ? "Firebase Realtime DB" : "Local only"}
        </div>
      </div>
    </div>
  );
}
