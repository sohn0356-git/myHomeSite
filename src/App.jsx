import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { missingFirebaseKeys } from "./lib/firebase";

import TopBar from "./components/TopBar";
import AttendancePage from "./components/AttendancePage";
import AnnualPage from "./components/AnnualPage";
import StudentsPage from "./components/StudentsPage";
import StudentDetail from "./components/StudentDetail";
import LoginPage from "./components/LoginPage";

import { seedMembers } from "./data/seedMembers";
import { addDays, getSunday, weekKey } from "./utils/date";
import { clearSession, loadSession, loginWithCredentials } from "./utils/auth";
import {
  deleteMemberPhotoByPath,
  ensureRemoteState,
  gradeToBirthYear,
  isFirebaseEnabled,
  loadState,
  saveState,
  subscribeRemoteState,
  uploadMemberPhoto,
} from "./utils/storage";

function buildInitialState() {
  return {
    classes: [],
    people: seedMembers,
    attendanceByWeek: {},
    profiles: {},
  };
}

function createPersonId(role) {
  const prefix = role === "선생님" ? "t" : "p";
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createClassId(name) {
  return `class_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function createStudentId(birthYear) {
  return `s_${birthYear}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const groupUid = session?.groupUid || "";

  const [activeTab, setActiveTab] = useState("attendance");
  const [sunday, setSunday] = useState(getSunday());
  const [selectedGrade, setSelectedGrade] = useState("1");
  const [state, setState] = useState(buildInitialState);
  const [syncMode, setSyncMode] = useState(
    isFirebaseEnabled() ? "firebase" : "local"
  );

  const { classes, people, attendanceByWeek, profiles } = state;
  const classNameById = useMemo(
    () =>
      classes.reduce((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    [classes]
  );
  const members = useMemo(
    () =>
      people.map((person) => ({
        ...person,
        className: classNameById[person.classId] || "",
      })),
    [people, classNameById]
  );
  const currentWeekKey = useMemo(() => weekKey(sunday), [sunday]);
  const attendanceMap = attendanceByWeek[currentWeekKey] || {};
  const birthYearKey = useMemo(
    () => gradeToBirthYear(selectedGrade),
    [selectedGrade]
  );

  const [detailMemberId, setDetailMemberId] = useState(null);
  const detailMember = members.find((m) => m.id === detailMemberId) || null;

  useEffect(() => {
    if (!session) {
      setState(buildInitialState());
      setSyncMode(isFirebaseEnabled() ? "firebase" : "local");
      return () => {};
    }

    setState(loadState(seedMembers, groupUid, selectedGrade));

    if (!isFirebaseEnabled()) {
      setSyncMode("local");
      return () => {};
    }

    let detached = false;
    let unsubscribe = () => {};

    const startSync = async () => {
      try {
        await ensureRemoteState(buildInitialState(), groupUid, selectedGrade);
        if (detached) return;

        unsubscribe = subscribeRemoteState(
          groupUid,
          selectedGrade,
          (remoteState) => {
            setState(remoteState);
          },
          () => {
            setSyncMode("local");
          }
        );
        setSyncMode("firebase");
      } catch {
        setSyncMode("local");
      }
    };

    startSync();

    return () => {
      detached = true;
      unsubscribe();
    };
  }, [groupUid, selectedGrade, session]);

  const persist = (next) => {
    setState(next);
    if (!session) return;
    saveState(next, groupUid, selectedGrade).catch(() => {});
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

  const onMarkAll = (value, memberIds) => {
    const next = { ...attendanceMap };
    const targetIds = Array.isArray(memberIds)
      ? memberIds
      : members.map((m) => m.id);
    targetIds.forEach((id) => {
      next[id] = value;
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

  const onCreateClass = (className) => {
    const trimmed = className.trim();
    if (!trimmed) return { ok: false, error: "반 이름을 입력해 주세요." };
    if (classes.some((item) => item.name === trimmed)) {
      return { ok: false, error: "이미 있는 반 이름입니다." };
    }

    persist({
      ...state,
      classes: [...classes, { id: createClassId(trimmed), name: trimmed }],
    });
    return { ok: true };
  };

  const onRemoveClass = (classId) => {
    const nextPeople = people.map((person) =>
      person.classId === classId ? { ...person, classId: "" } : person
    );
    persist({
      ...state,
      classes: classes.filter((item) => item.id !== classId),
      people: nextPeople,
    });
  };

  const onAddMember = ({ name, role, classId }) => {
    const trimmedName = name.trim();
    if (!trimmedName) return { ok: false, error: "이름을 입력해 주세요." };

    let personId = createPersonId(role);
    let personBirthYear = "";

    if (role === "학생") {
      if (!birthYearKey) {
        return { ok: false, error: "학년 기준 출생연도를 계산할 수 없습니다." };
      }
      personId = createStudentId(birthYearKey);
      personBirthYear = birthYearKey;
    }

    persist({
      ...state,
      people: [
        ...people,
        {
          id: personId,
          name: trimmedName,
          role,
          classId: classId || "",
          birthYear: personBirthYear,
        },
      ],
    });
    return { ok: true };
  };

  const onMoveMemberToClass = (memberId, classId) => {
    const nextPeople = people.map((person) =>
      person.id === memberId ? { ...person, classId: classId || "" } : person
    );
    persist({
      ...state,
      people: nextPeople,
    });
  };

  const onRemoveMember = async (memberId) => {
    const removedProfile = profiles[memberId];

    const nextPeople = people.filter((m) => m.id !== memberId);
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

    if (detailMemberId === memberId) setDetailMemberId(null);

    persist({
      ...state,
      people: nextPeople,
      profiles: nextProfiles,
      attendanceByWeek: nextAttendanceByWeek,
    });

    if (removedProfile?.photoPath) {
      try {
        await deleteMemberPhotoByPath(removedProfile.photoPath);
      } catch {}
    }
  };

  const onUploadPhoto = async (memberId, file) => {
    const result = await uploadMemberPhoto(memberId, file, groupUid);
    const prevPath = profiles[memberId]?.photoPath;

    if (prevPath && prevPath !== result.path) {
      try {
        await deleteMemberPhotoByPath(prevPath);
      } catch {}
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
      } catch {}
    }

    const prev = profiles[memberId] || {};
    const nextProfile = { ...prev };
    delete nextProfile.photoPath;
    delete nextProfile.photoUrl;
    delete nextProfile.photoDataUrl;
    onChangeProfile(memberId, nextProfile);
  };

  const onChangeGrade = (nextGrade) => {
    setDetailMemberId(null);
    setSelectedGrade(nextGrade);
  };

  const onLogin = async (groupName, password) => {
    const result = await loginWithCredentials(groupName, password);
    if (!result.ok) return result;
    setSession(result.session);
    setActiveTab("attendance");
    setSunday(getSunday());
    setSelectedGrade("1");
    return result;
  };

  const onLogout = () => {
    clearSession();
    setSession(null);
    setDetailMemberId(null);
  };

  if (!session) {
    return <LoginPage onLogin={onLogin} firebaseReady={isFirebaseEnabled()} />;
  }

  const year = sunday.getFullYear();
  const appTitle = `${selectedGrade}학년 출석부`;

  return (
    <div className="page">
      <div className="container">
        <TopBar
          title={appTitle}
          subtitle="출석 / 연간 / 구성원 관리"
          groupLabel={session.displayName || session.groupName}
          onLogout={onLogout}
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            setDetailMemberId(null);
          }}
        />

        {activeTab === "attendance" && (
          <AttendancePage
            grade={selectedGrade}
            onChangeGrade={onChangeGrade}
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
            grade={selectedGrade}
            onChangeGrade={onChangeGrade}
            classes={classes}
            members={members}
            attendanceByWeek={attendanceByWeek}
          />
        )}

        {activeTab === "members" && (
          <StudentsPage
            grade={selectedGrade}
            classes={classes}
            members={members}
            profiles={profiles}
            birthYearKey={birthYearKey}
            onChangeGrade={onChangeGrade}
            onCreateClass={onCreateClass}
            onRemoveClass={onRemoveClass}
            onAddMember={onAddMember}
            onMoveMemberToClass={onMoveMemberToClass}
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
          {!isFirebaseEnabled() && missingFirebaseKeys.length
            ? " · Firebase 설정 필요"
            : ""}
        </div>
      </div>
    </div>
  );
}
