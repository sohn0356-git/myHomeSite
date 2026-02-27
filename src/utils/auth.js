import { get, ref, set } from "firebase/database";
import { firebaseEnabled, realtimeDb } from "../lib/firebase";

const SESSION_KEY = "classSite.session.v1";
const INVALID_KEY_CHARS = /[.#$/\[\]]/;

async function pathExists(path) {
  const snap = await get(ref(realtimeDb, path));
  return snap.exists();
}

function makeUidCandidate() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `grp_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  }
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function generateUniqueGroupUid() {
  for (let i = 0; i < 20; i += 1) {
    const uid = makeUidCandidate();
    const used = await pathExists(`classSite/groups/${uid}`);
    if (!used) return uid;
  }
  throw new Error("group_uid_generation_failed");
}

function readGroupCredential(groupName) {
  const paths = [
    `classSite/groupCredentials/${groupName}`,
    `groupCredentials/${groupName}`,
    `classSite/groups/${groupName}/credential`,
  ];
  return paths.reduce(async (prev, path) => {
    const found = await prev;
    if (found) return found;
    const snap = await get(ref(realtimeDb, path));
    if (!snap.exists()) return null;
    return { path, data: snap.val() };
  }, Promise.resolve(null));
}

async function ensureGroupUid(credentialPath, account, groupName) {
  const existing =
    account?.groupUid || account?.group_id || account?.groupId || account?.group;
  if (typeof existing === "string" && existing.trim()) return existing.trim();

  const created = await generateUniqueGroupUid();
  await set(ref(realtimeDb, `${credentialPath}/groupUid`), created);
  return created;
}

function toSession(groupName, groupUid, account) {
  return {
    groupName,
    groupUid,
    name:
      typeof account?.name === "string" && account.name.trim()
        ? account.name.trim()
        : groupName,
  };
}

export async function loginWithCredentials(groupNameInput, passwordInput) {
  if (!firebaseEnabled) {
    return { ok: false, error: "Firebase 설정이 필요합니다." };
  }

  const groupName = (groupNameInput || "").trim();
  const password = String(passwordInput || "");
  if (!groupName || !password) {
    return { ok: false, error: "그룹명과 그룹 비밀번호를 입력해 주세요." };
  }
  if (INVALID_KEY_CHARS.test(groupName)) {
    return { ok: false, error: "그룹명에 사용할 수 없는 문자가 포함되어 있습니다." };
  }

  try {
    const credential = await readGroupCredential(groupName);
    if (!credential || typeof credential.data !== "object") {
      return { ok: false, error: "존재하지 않는 그룹입니다." };
    }
    const account = credential.data;

    const savedPassword = String(
      account.password ?? account.pass ?? account.pw ?? ""
    );
    if (savedPassword !== password) {
      return { ok: false, error: "그룹 비밀번호가 일치하지 않습니다." };
    }

    const groupUid = await ensureGroupUid(credential.path, account, groupName);
    const session = toSession(groupName, groupUid, account);

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  } catch {
    return { ok: false, error: "로그인 중 오류가 발생했습니다." };
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.groupUid || !parsed?.groupName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
