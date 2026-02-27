import { get, ref } from "firebase/database";
import { firebaseEnabled, realtimeDb } from "../lib/firebase";

const SESSION_KEY = "classSite.session.v1";
const INVALID_KEY_CHARS = /[.#$/\[\]]/;

function readAccount(loginId) {
  const paths = [`classSite/accounts/${loginId}`, `accounts/${loginId}`];
  return paths.reduce(async (prev, path) => {
    const found = await prev;
    if (found) return found;
    const snap = await get(ref(realtimeDb, path));
    if (!snap.exists()) return null;
    return snap.val();
  }, Promise.resolve(null));
}

function toSession(loginId, account) {
  const groupUid =
    account?.groupUid || account?.group_id || account?.groupId || account?.group;
  if (typeof groupUid !== "string" || !groupUid.trim()) return null;

  return {
    loginId,
    groupUid: groupUid.trim(),
    displayName:
      typeof account?.name === "string" && account.name.trim()
        ? account.name.trim()
        : loginId,
  };
}

export async function loginWithCredentials(loginIdInput, passwordInput) {
  if (!firebaseEnabled) {
    return { ok: false, error: "Firebase 설정이 필요합니다." };
  }

  const loginId = (loginIdInput || "").trim();
  const password = String(passwordInput || "");
  if (!loginId || !password) {
    return { ok: false, error: "아이디와 비밀번호를 입력해 주세요." };
  }
  if (INVALID_KEY_CHARS.test(loginId)) {
    return { ok: false, error: "아이디에 사용할 수 없는 문자가 포함되어 있습니다." };
  }

  try {
    const account = await readAccount(loginId);
    if (!account || typeof account !== "object") {
      return { ok: false, error: "존재하지 않는 계정입니다." };
    }

    const savedPassword = String(
      account.password ?? account.pass ?? account.pw ?? ""
    );
    if (savedPassword !== password) {
      return { ok: false, error: "비밀번호가 일치하지 않습니다." };
    }

    const session = toSession(loginId, account);
    if (!session) {
      return { ok: false, error: "계정에 group uid가 없습니다." };
    }

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
    if (!parsed?.groupUid || !parsed?.loginId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
