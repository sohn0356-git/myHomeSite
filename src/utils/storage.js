import { get, onValue, ref, set } from "firebase/database";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { firebaseEnabled, realtimeDb, storageBucket } from "../lib/firebase";

const LOCAL_KEY = "classSite.v2";
const ROOT_PATH = "classSite";

function normalizeState(raw, fallbackMembers = []) {
  if (!raw || typeof raw !== "object") {
    return {
      members: fallbackMembers,
      attendanceByWeek: {},
      profiles: {},
    };
  }

  return {
    members:
      Array.isArray(raw.members) && raw.members.length > 0
        ? raw.members
        : fallbackMembers,
    attendanceByWeek: raw.attendanceByWeek || {},
    profiles: raw.profiles || {},
  };
}

export function isFirebaseEnabled() {
  return firebaseEnabled;
}

export function loadState(fallbackMembers = []) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return normalizeState(null, fallbackMembers);
    return normalizeState(JSON.parse(raw), fallbackMembers);
  } catch {
    return normalizeState(null, fallbackMembers);
  }
}

export function saveState(state) {
  const normalized = normalizeState(state);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(normalized));

  if (!firebaseEnabled) return;
  set(ref(realtimeDb, ROOT_PATH), normalized).catch((err) => {
    console.error("Failed to sync state to Firebase Realtime Database:", err);
  });
}

export async function ensureRemoteState(seedState) {
  if (!firebaseEnabled) return;
  const rootRef = ref(realtimeDb, ROOT_PATH);
  const snap = await get(rootRef);
  if (!snap.exists()) {
    await set(rootRef, normalizeState(seedState));
  }
}

export function subscribeRemoteState(onState) {
  if (!firebaseEnabled) return () => {};
  const rootRef = ref(realtimeDb, ROOT_PATH);
  return onValue(rootRef, (snap) => {
    if (!snap.exists()) return;
    const next = normalizeState(snap.val());
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    onState(next);
  });
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
