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
  return {
    localKey: `${LOCAL_KEY_BASE}.${safeGroupUid}.${birthYear || "unknown"}`,
    remotePath: `${ROOT_PATH}/${safeGroupUid}/byBirthYear/${birthYear || "unknown"}`,
    groupUid: safeGroupUid,
    birthYear,
  };
}

function normalizeState(raw, fallbackMembers = [], birthYearKey = "") {
  const rawClasses = Array.isArray(raw?.classes) ? raw.classes : [];
  const fallbackClassNames = Array.isArray(raw?.classNames) ? raw.classNames : [];
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
    raw?.people && !Array.isArray(raw.people) && typeof raw.people === "object"
      ? raw.people
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
  const teachersBucket =
    peopleTree && peopleTree.teacher && typeof peopleTree.teacher === "object"
      ? Object.values(peopleTree.teacher)
      : [];
  const rawPeople = peopleTree
    ? [...studentsForScope, ...teachersBucket]
    : Array.isArray(raw?.people)
    ? raw.people
    : Array.isArray(raw?.members)
    ? raw.members
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

  if (!raw || typeof raw !== "object") {
    return {
      classes: [],
      people: fallbackMembers.map((member, idx) => ({
        id:
          typeof member?.id === "string" && member.id
            ? member.id
            : `person_${idx + 1}`,
        name: member?.name || `구성원${idx + 1}`,
        role: member?.role === "선생님" ? "선생님" : "학생",
        classId: "",
        birthYear: birthYearKey,
      })),
      attendanceByWeek: {},
      profiles: {},
    };
  }

  return {
    classes,
    people,
    attendanceByWeek: raw.attendanceByWeek || {},
    profiles: raw.profiles || {},
  };
}

function encodeStateForStorage(state, birthYearKey = "") {
  const normalized = normalizeState(state, [], birthYearKey);
  const students = {};
  const teachers = {};

  normalized.people.forEach((person) => {
    if (person.role === "학생") {
      if (!birthYearKey) return;
      if (!students[birthYearKey]) students[birthYearKey] = {};
      students[birthYearKey][person.id] = person;
      return;
    }
    teachers[person.id] = person;
  });

  return {
    classes: normalized.classes,
    people: {
      student: students,
      teacher: teachers,
    },
    attendanceByWeek: normalized.attendanceByWeek,
    profiles: normalized.profiles,
  };
}

export function isFirebaseEnabled() {
  return firebaseEnabled;
}

export function loadState(fallbackMembers = [], groupUid = "", grade = "1") {
  const { localKey, birthYear } = getScope(groupUid, grade);
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return normalizeState(null, fallbackMembers, birthYear);
    return normalizeState(JSON.parse(raw), fallbackMembers, birthYear);
  } catch {
    return normalizeState(null, fallbackMembers, birthYear);
  }
}

export function saveState(state, groupUid = "", grade = "1") {
  const { localKey, remotePath, birthYear } = getScope(groupUid, grade);
  const normalized = normalizeState(state, [], birthYear);
  const encoded = encodeStateForStorage(normalized, birthYear);
  localStorage.setItem(localKey, JSON.stringify(encoded));

  if (!firebaseEnabled) return Promise.resolve();

  remoteWriteChain = remoteWriteChain
    .catch(() => {})
    .then(() =>
      set(ref(realtimeDb, remotePath), encoded)
    );

  return remoteWriteChain.catch((err) => {
    err.remotePath = remotePath;
    throw err;
  });
}

export async function ensureRemoteState(seedState, groupUid = "", grade = "1") {
  if (!firebaseEnabled) return;
  const { remotePath, birthYear } = getScope(groupUid, grade);
  const rootRef = ref(realtimeDb, remotePath);
  const snap = await get(rootRef);
  if (!snap.exists()) {
    try {
      const normalized = normalizeState(seedState, [], birthYear);
      await set(rootRef, encodeStateForStorage(normalized, birthYear));
    } catch (err) {
      err.remotePath = remotePath;
      throw err;
    }
  }
}

export function subscribeRemoteState(groupUid = "", grade = "1", onState, onError) {
  if (!firebaseEnabled) return () => {};
  const { localKey, remotePath, birthYear } = getScope(groupUid, grade);
  const rootRef = ref(realtimeDb, remotePath);
  return onValue(
    rootRef,
    (snap) => {
      if (!snap.exists()) return;
      const next = normalizeState(snap.val(), [], birthYear);
      const encoded = encodeStateForStorage(next, birthYear);
      localStorage.setItem(localKey, JSON.stringify(encoded));
      onState(next);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
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
