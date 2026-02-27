import { useState } from "react";

export default function LoginPage({ onLogin, firebaseReady }) {
  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const result = await onLogin(groupName, password);
    if (!result?.ok) {
      setError(result?.error || "로그인에 실패했습니다.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="page">
      <div className="container loginContainer">
        <section className="heroCard loginCard">
          <div className="panelTitle">출석부 로그인</div>
          <div className="panelDesc">
            그룹명과 그룹 비밀번호로 로그인합니다.
          </div>
          {!firebaseReady ? (
            <div className="hintSmall">Firebase 설정이 필요합니다.</div>
          ) : null}

          <form className="formGrid" onSubmit={submit}>
            <label className="field fieldFull">
              <div className="fieldLabel">그룹명</div>
              <input
                className="fieldInput"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="그룹명"
                autoComplete="organization"
              />
            </label>

            <label className="field fieldFull">
              <div className="fieldLabel">그룹 비밀번호</div>
              <input
                type="password"
                className="fieldInput"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="그룹 비밀번호"
                autoComplete="current-password"
              />
            </label>

            <button type="submit" disabled={isSubmitting || !firebaseReady}>
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {error ? <div className="hintSmall">{error}</div> : null}
        </section>
      </div>
    </div>
  );
}
