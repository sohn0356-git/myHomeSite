import { get, onValue, ref, set } from "firebase/database";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { firebaseEnabled, realtimeDb, storageBucket } from "../lib/firebase";

const LOCAL_KEY_BASE = "classSite.v5";
const ROOT_PATH = "classSite/groups";
let remoteWriteChain = Promise.resolve();

export function gradeToBirthYear(grade, today = new Date()) {
  const gradeNum = Number(grade);
  if (![1, 2, 3].includes(gradeNum)) return "";
  return String(today.getFullYear() - (gradeNum + 15));
}

function getScope(groupUid, grade) {
  const birthYear = gradeToBirthYear(grade);
  const safeGroupUid = typeof groupUid === "string" && groupUid.trim() ? groupUid.trim() : "unknown";
  const groupRootPath = `${ROOT_PATH}/${safeGroupUid}`;
  return {
    localKey: `${LOCAL_KEY_BASE}.${safeGroupUid}.${birthYear || "unknown"}`,
    teachersLocalKey: `${LOCAL_KEY_BASE}.${safeGroupUid}.teachers`,
    remotePath: `${groupRootPath}/byBirthYear/${birthYear || "unknown"}`,
    teachersPath: `${groupRootPath}/teachers`,
    groupRootPath,
    groupUid: safeGroupUid,
    birthYear,
  };
}

function normalizeState(rawYear, rawTeachers, fallbackMembers = [], birthYearKey = "") {
  const safeRawYear =
    rawYear && typeof rawYear === "object" ? rawYear : {};
  const rawClasses = Array.isArray(safeRawYear?.classes) ? safeRawYear.classes : [];
  const fallbackClassNames = Array.isArray(safeRawYear?.classNames) ? safeRawYear.classNames : [];
  const classesFromLegacy = fallbackClassNames
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter(Boolean)
    .map((name) => ({
      id: `class_${name}`,
      name,
    }));

  const classes = (rawClasses.length ? rawClasses : classesFromLegacy)
    .map((item) => ({
      id: typeof item?.id === "string" && item.id.trim() ? item.id.trim() : "",
      name:
        typeof item?.name === "string" && item.name.trim() ? item.name.trim() : "",
    }))
    .filter((item) => item.id && item.name);

  const classByName = new Map(classes.map((item) => [item.name, item.id]));
  const peopleTree =
    safeRawYear?.people &&
    !Array.isArray(safeRawYear.people) &&
    typeof safeRawYear.people === "object"
      ? safeRawYear.people
      : null;
  const studentsByYear =
    peopleTree && peopleTree.student && typeof peopleTree.student === "object"
      ? peopleTree.student
      : {};
  const studentsForScope =
    birthYearKey &&
    studentsByYear[birthYearKey] &&
    typeof studentsByYear[birthYearKey] === "object"
      ? Object.values(studentsByYear[birthYearKey])
      : [];
  const teachersBucketFromYear =
    peopleTree && peopleTree.teacher && typeof peopleTree.teacher === "object"
      ? Object.values(peopleTree.teacher)
      : [];
  const teachersBucketFromRoot =
    rawTeachers && typeof rawTeachers === "object"
      ? Object.values(rawTeachers)
      : [];
  const teachersBucket =
    teachersBucketFromRoot.length > 0 ? teachersBucketFromRoot : teachersBucketFromYear;
  const rawPeople = peopleTree
    ? [...studentsForScope, ...teachersBucket]
    : teachersBucketFromRoot.length > 0
    ? teachersBucketFromRoot
    : Array.isArray(safeRawYear?.people)
    ? safeRawYear.people
    : Array.isArray(safeRawYear?.members)
    ? safeRawYear.members
    : fallbackMembers;
  const people = rawPeople.map((person, idx) => {
    const safeRole = person?.role === "선생님" ? "선생님" : "학생";
    const safeName =
      typeof person?.name === "string" && person.name.trim()
        ? person.name.trim()
        : `구성원${idx + 1}`;
    const legacyClassName =
      typeof person?.className === "string" ? person.className.trim() : "";
    const classId =
      typeof person?.classId === "string" && person.classId.trim()
        ? person.classId.trim()
        : classByName.get(legacyClassName) || "";
    const fallbackId =
      typeof person?.id === "string" && person.id.trim()
        ? person.id.trim()
        : `person_${idx + 1}`;
    const id = fallbackId;
    const birthYear =
      typeof person?.birthYear === "string" && person.birthYear.trim()
        ? person.birthYear.trim()
        : birthYearKey;

    return {
      id,
      name: safeName,
      role: safeRole,
      classId,
      birthYear: safeRole === "학생" ? birthYear : "",
    };
  });

  return {
    classes,
    people,
    attendanceByWeek: safeRawYear.attendanceByWeek || {},
    profiles: safeRawYear.profiles || {},
  };
}

function encodeYearStateForStorage(state, birthYearKey = "") {
  const normalized = normalizeState(state, null, [], birthYearKey);
  const students = {};

  normalized.people.forEach((person) => {
    if (person.role !== "학생") return;
    if (!birthYearKey) return;
    if (!students[birthYearKey]) students[birthYearKey] = {};
    students[birthYearKey][person.id] = person;
  });

  return {
    classes: normalized.classes,
    people: {
      student: students,
    },
    attendanceByWeek: normalized.attendanceByWeek,
    profiles: normalized.profiles,
  };
}

function encodeTeachersForStorage(state) {
  const teachers = {};
  (state.people || []).forEach((person) => {
    if (person.role !== "선생님") return;
    teachers[person.id] = person;
  });
  return teachers;
}

export function isFirebaseEnabled() {
  return firebaseEnabled;
}

export function loadState(fallbackMembers = [], groupUid = "", grade = "1") {
  const { localKey, teachersLocalKey, birthYear } = getScope(groupUid, grade);
  try {
    const rawYear = localStorage.getItem(localKey);
    const rawTeachers = localStorage.getItem(teachersLocalKey);
    if (!rawYear) return normalizeState(null, rawTeachers ? JSON.parse(rawTeachers) : null, fallbackMembers, birthYear);
    return normalizeState(
      JSON.parse(rawYear),
      rawTeachers ? JSON.parse(rawTeachers) : null,
      fallbackMembers,
      birthYear
    );
  } catch {
    return normalizeState(null, null, fallbackMembers, birthYear);
  }
}

export function saveState(state, groupUid = "", grade = "1") {
  const { localKey, teachersLocalKey, remotePath, teachersPath, birthYear } = getScope(
    groupUid,
    grade
  );
  const normalized = normalizeState(state, null, [], birthYear);
  const encodedYear = encodeYearStateForStorage(normalized, birthYear);
  const encodedTeachers = encodeTeachersForStorage(normalized);
  localStorage.setItem(localKey, JSON.stringify(encodedYear));
  localStorage.setItem(teachersLocalKey, JSON.stringify(encodedTeachers));

  if (!firebaseEnabled) return Promise.resolve();

  remoteWriteChain = remoteWriteChain
    .catch(() => {})
    .then(() =>
      Promise.all([
        set(ref(realtimeDb, remotePath), encodedYear),
        set(ref(realtimeDb, teachersPath), encodedTeachers),
      ])
    );

  return remoteWriteChain.catch((err) => {
    err.remotePath = remotePath;
    throw err;
  });
}

export async function ensureRemoteState(seedState, groupUid = "", grade = "1") {
  if (!firebaseEnabled) return;
  const { remotePath, teachersPath, birthYear } = getScope(groupUid, grade);
  const yearRef = ref(realtimeDb, remotePath);
  const teachersRef = ref(realtimeDb, teachersPath);
  const [yearSnap, teachersSnap] = await Promise.all([get(yearRef), get(teachersRef)]);
  if (!yearSnap.exists()) {
    try {
      const normalized = normalizeState(seedState, null, [], birthYear);
      await set(yearRef, encodeYearStateForStorage(normalized, birthYear));
    } catch (err) {
      err.remotePath = remotePath;
      throw err;
    }
  }
  if (!teachersSnap.exists()) {
    try {
      const normalized = normalizeState(seedState, null, [], birthYear);
      await set(teachersRef, encodeTeachersForStorage(normalized));
    } catch (err) {
      err.remotePath = teachersPath;
      throw err;
    }
  }
}

export function subscribeRemoteState(groupUid = "", grade = "1", onState, onError) {
  if (!firebaseEnabled) return () => {};
  const { localKey, teachersLocalKey, remotePath, teachersPath, birthYear } = getScope(
    groupUid,
    grade
  );
  const yearRef = ref(realtimeDb, remotePath);
  const teachersRef = ref(realtimeDb, teachersPath);
  let latestYear = null;
  let latestTeachers = null;
  let yearReady = false;
  let teachersReady = false;

  const emit = () => {
    if (!yearReady || !teachersReady) return;
    const next = normalizeState(latestYear, latestTeachers, [], birthYear);
    localStorage.setItem(localKey, JSON.stringify(encodeYearStateForStorage(next, birthYear)));
    localStorage.setItem(teachersLocalKey, JSON.stringify(encodeTeachersForStorage(next)));
    onState(next);
  };

  const unsubYear = onValue(
    yearRef,
    (snap) => {
      yearReady = true;
      latestYear = snap.exists() ? snap.val() : {};
      emit();
    },
    (err) => {
      if (onError) onError(err);
    }
  );

  const unsubTeachers = onValue(
    teachersRef,
    (snap) => {
      teachersReady = true;
      latestTeachers = snap.exists() ? snap.val() : {};
      emit();
    },
    (err) => {
      if (onError) onError(err);
    }
  );

  return () => {
    unsubYear();
    unsubTeachers();
  };
}

export async function loadRemoteState(
  fallbackMembers = [],
  groupUid = "",
  grade = "1"
) {
  const { localKey, teachersLocalKey, remotePath, teachersPath, birthYear } = getScope(
    groupUid,
    grade
  );
  if (!firebaseEnabled) {
    return normalizeState(null, null, fallbackMembers, birthYear);
  }

  const yearRef = ref(realtimeDb, remotePath);
  const teachersRef = ref(realtimeDb, teachersPath);
  const [yearSnap, teachersSnap] = await Promise.all([get(yearRef), get(teachersRef)]);
  const rawYear = yearSnap.exists() ? yearSnap.val() : {};
  const rawTeachers = teachersSnap.exists() ? teachersSnap.val() : {};
  const next = normalizeState(rawYear, rawTeachers, fallbackMembers, birthYear);

  localStorage.setItem(localKey, JSON.stringify(encodeYearStateForStorage(next, birthYear)));
  localStorage.setItem(teachersLocalKey, JSON.stringify(encodeTeachersForStorage(next)));
  return next;
}

export async function uploadMemberPhoto(memberId, file, groupUid = "") {
  if (!firebaseEnabled) {
    throw new Error("Firebase is not configured.");
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const safeGroupUid = typeof groupUid === "string" && groupUid.trim() ? groupUid.trim() : "unknown";
  const path = `groups/${safeGroupUid}/students/${memberId}.${ext}`;
  const fileRef = storageRef(storageBucket, path);
  await uploadBytes(fileRef, file, {
    contentType: file.type || "image/jpeg",
  });
  const url = await getDownloadURL(fileRef);
  return { path, url };
}

export async function deleteMemberPhotoByPath(path) {
  if (!firebaseEnabled || !path) return;
  const fileRef = storageRef(storageBucket, path);
  await deleteObject(fileRef);
}
