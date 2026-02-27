import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { missingFirebaseKeys } from "./lib/firebase";

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

function formatFirebaseError(err, fallbackMessage) {
  const code = typeof err?.code === "string" ? err.code : "";
  const message = err?.message || fallbackMessage;
  const path = err?.remotePath ? ` (path: ${err.remotePath})` : "";
  return `${code ? `${code} - ` : ""}${message}${path}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [sunday, setSunday] = useState(getSunday());
  const [selectedGrade, setSelectedGrade] = useState("1");
  const [state, setState] = useState(() => loadState(seedMembers, "1"));
  const [syncMode, setSyncMode] = useState(
    isFirebaseEnabled() ? "firebase" : "local"
  );
  const [lastWriteResult, setLastWriteResult] = useState(null);
  const [syncError, setSyncError] = useState("");

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
    setState(loadState(seedMembers, selectedGrade));

    if (!isFirebaseEnabled()) {
      setSyncMode("local");
      return () => {};
    }

    let detached = false;
    let unsubscribe = () => {};

    const startSync = async () => {
      try {
        setSyncError("");
        await ensureRemoteState(buildInitialState(), selectedGrade);
        if (detached) return;

        unsubscribe = subscribeRemoteState(
          selectedGrade,
          (remoteState) => {
            setState(remoteState);
          },
          (err) => {
            console.error("Firebase subscribe failed:", err);
            setSyncError(formatFirebaseError(err, "구독 실패"));
            setSyncMode("local");
          }
        );
        setSyncMode("firebase");
      } catch (err) {
        console.error("Firebase sync setup failed:", err);
        setSyncError(formatFirebaseError(err, "초기화 실패"));
        setSyncMode("local");
      }
    };

    startSync();

    return () => {
      detached = true;
      unsubscribe();
    };
  }, [selectedGrade]);

  const persist = (next) => {
    setState(next);
    saveState(next, selectedGrade)
      .then(() => {
        setSyncError("");
        setLastWriteResult({
          ok: true,
          mode: isFirebaseEnabled() ? "firebase" : "local",
          at: new Date().toISOString(),
          error: "",
        });
      })
      .catch((err) => {
        console.error("State sync failed:", err);
        setSyncError(formatFirebaseError(err, "저장 실패"));
        setLastWriteResult({
          ok: false,
          mode: isFirebaseEnabled() ? "firebase" : "local",
          at: new Date().toISOString(),
          error: err?.message || "알 수 없는 오류",
        });
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

  const onMarkAll = (value, memberIds) => {
    const next = { ...attendanceMap };
    const targetIds = Array.isArray(memberIds) ? memberIds : members.map((m) => m.id);
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
    if (!trimmedName) {
      return { ok: false, error: "이름을 입력해 주세요." };
    }

    let personId = createPersonId(role);
    let personBirthYear = "";

    if (role === "학생") {
      if (!birthYearKey) {
        return {
          ok: false,
          error: "학년 기준 출생연도 key를 계산할 수 없습니다.",
        };
      }
      personId = createStudentId(birthYearKey);
      personBirthYear = birthYearKey;
    }

    const nextMember = {
      id: personId,
      name: trimmedName,
      role,
      classId: classId || "",
      birthYear: personBirthYear,
    };

    persist({
      ...state,
      people: [...people, nextMember],
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

    if (detailMemberId === memberId) {
      setDetailMemberId(null);
    }

    persist({
      ...state,
      people: nextPeople,
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
  const appTitle = `${selectedGrade}학년 출석부`;
  const onChangeGrade = (nextGrade) => {
    setDetailMemberId(null);
    setSelectedGrade(nextGrade);
  };
  const writeAtText = lastWriteResult?.at
    ? new Date(lastWriteResult.at).toLocaleString("ko-KR")
    : "";

  return (
    <div className="page">
      <div className="container">
        <TopBar
          title={appTitle}
          subtitle="출석 / 연간 / 구성원 관리"
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            setDetailMemberId(null);
          }}
        />

        {activeTab === "attendance" && (
          <AttendancePage
            grade={selectedGrade}
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
            ? ` · Firebase 설정 누락: ${missingFirebaseKeys.join(", ")}`
            : ""}
          {" · "}
          저장 경로:{" "}
          {birthYearKey
            ? `classSite/byBirthYear/${birthYearKey}/people/student/${birthYearKey}`
            : "미지정"}
          {lastWriteResult ? (
            <>
              {" · "}
              최근 write:{" "}
              {lastWriteResult.ok ? "성공" : "실패"} ({writeAtText})
              {!lastWriteResult.ok && lastWriteResult.error
                ? ` - ${lastWriteResult.error}`
                : ""}
            </>
          ) : null}
          {syncError ? ` · 동기화 오류: ${syncError}` : ""}
        </div>
      </div>
    </div>
  );
}
