import { get, onValue, ref, set } from "firebase/database";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { firebaseEnabled, realtimeDb, storageBucket } from "../lib/firebase";

const LOCAL_KEY_BASE = "classSite.v4";
const ROOT_PATH = "classSite/byBirthYear";
let remoteWriteChain = Promise.resolve();

export function gradeToBirthYear(grade, today = new Date()) {
  const gradeNum = Number(grade);
  if (![1, 2, 3].includes(gradeNum)) return "";
  return String(today.getFullYear() - (gradeNum + 15));
}

function getScope(grade) {
  const birthYear = gradeToBirthYear(grade);
  return {
    localKey: `${LOCAL_KEY_BASE}.${birthYear || "unknown"}`,
    remotePath: `${ROOT_PATH}/${birthYear || "unknown"}`,
    birthYear,
  };
}

function normalizeState(raw, fallbackMembers = []) {
  const legacyClassName =
    raw && typeof raw.className === "string" ? raw.className.trim() : "";
  const nextClassNames = Array.isArray(raw?.classNames)
    ? raw.classNames
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean)
    : legacyClassName
    ? [legacyClassName]
    : [];

  const rawMembers = Array.isArray(raw?.members) ? raw.members : fallbackMembers;
  const members = rawMembers.map((member, idx) => {
    const safeRole = member?.role === "선생님" ? "선생님" : "학생";
    const safeName =
      typeof member?.name === "string" && member.name.trim()
        ? member.name.trim()
        : `구성원${idx + 1}`;
    const safeClassName =
      typeof member?.className === "string" ? member.className.trim() : "";

    return {
      ...member,
      name: safeName,
      role: safeRole,
      className: safeClassName,
    };
  });

  if (!raw || typeof raw !== "object") {
    return {
      grade: "",
      classNames: [],
      members: fallbackMembers.map((member) => ({
        ...member,
        className: typeof member?.className === "string" ? member.className : "",
      })),
      attendanceByWeek: {},
      profiles: {},
    };
  }

  return {
    grade: typeof raw.grade === "string" ? raw.grade.trim() : "",
    classNames: nextClassNames,
    members,
    attendanceByWeek: raw.attendanceByWeek || {},
    profiles: raw.profiles || {},
  };
}

export function isFirebaseEnabled() {
  return firebaseEnabled;
}

export function loadState(fallbackMembers = [], grade = "1") {
  const { localKey } = getScope(grade);
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return normalizeState(null, fallbackMembers);
    return normalizeState(JSON.parse(raw), fallbackMembers);
  } catch {
    return normalizeState(null, fallbackMembers);
  }
}

export function saveState(state, grade = "1") {
  const { localKey, remotePath } = getScope(grade);
  const normalized = normalizeState(state);
  localStorage.setItem(localKey, JSON.stringify(normalized));

  if (!firebaseEnabled) return Promise.resolve();

  remoteWriteChain = remoteWriteChain
    .catch(() => {})
    .then(() =>
      set(ref(realtimeDb, remotePath), normalized).then(() => {
        console.info("[Firebase write] success:", remotePath, new Date().toISOString());
      })
    );

  return remoteWriteChain.catch((err) => {
    console.error("Failed to sync state to Firebase Realtime Database:", err);
    throw err;
  });
}

export async function ensureRemoteState(seedState, grade = "1") {
  if (!firebaseEnabled) return;
  const { remotePath } = getScope(grade);
  const rootRef = ref(realtimeDb, remotePath);
  const snap = await get(rootRef);
  if (!snap.exists()) {
    await set(rootRef, normalizeState(seedState));
  }
}

export function subscribeRemoteState(grade = "1", onState, onError) {
  if (!firebaseEnabled) return () => {};
  const { localKey, remotePath } = getScope(grade);
  const rootRef = ref(realtimeDb, remotePath);
  return onValue(
    rootRef,
    (snap) => {
      if (!snap.exists()) return;
      const next = normalizeState(snap.val());
      localStorage.setItem(localKey, JSON.stringify(next));
      onState(next);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function uploadMemberPhoto(memberId, file) {
  if (!firebaseEnabled) {
    throw new Error("Firebase is not configured.");
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `students/${memberId}.${ext}`;
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
