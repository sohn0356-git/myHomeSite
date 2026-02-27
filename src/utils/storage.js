import { get, onValue, ref, set } from "firebase/database";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { firebaseEnabled, realtimeDb, storageBucket } from "../lib/firebase";

const LOCAL_KEY_BASE = "classSite.v5";
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

export function birthDateToKey(birthDate) {
  if (typeof birthDate !== "string") return "";
  const cleaned = birthDate.replaceAll("-", "").trim();
  return /^\d{8}$/.test(cleaned) ? cleaned : "";
}

function normalizeState(raw, fallbackMembers = []) {
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
  const rawPeople = Array.isArray(raw?.people)
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
    const birthDate =
      typeof person?.birthDate === "string" && person.birthDate.trim()
        ? person.birthDate.trim()
        : "";
    const birthKey = birthDateToKey(birthDate);
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
    const id = safeRole === "학생" && birthKey ? birthKey : fallbackId;

    return {
      id,
      name: safeName,
      role: safeRole,
      classId,
      birthDate,
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
        birthDate: "",
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
    err.remotePath = remotePath;
    throw err;
  });
}

export async function ensureRemoteState(seedState, grade = "1") {
  if (!firebaseEnabled) return;
  const { remotePath } = getScope(grade);
  const rootRef = ref(realtimeDb, remotePath);
  const snap = await get(rootRef);
  if (!snap.exists()) {
    try {
      await set(rootRef, normalizeState(seedState));
    } catch (err) {
      err.remotePath = remotePath;
      throw err;
    }
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
