import { useState } from "react";

export default function LoginPage({ onLogin, firebaseReady }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const result = await onLogin(loginId, password);
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
            계정에 연결된 그룹 데이터만 조회할 수 있습니다.
          </div>
          {!firebaseReady ? (
            <div className="hintSmall">Firebase 설정이 필요합니다.</div>
          ) : null}

          <form className="formGrid" onSubmit={submit}>
            <label className="field fieldFull">
              <div className="fieldLabel">아이디</div>
              <input
                className="fieldInput"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="아이디"
                autoComplete="username"
              />
            </label>

            <label className="field fieldFull">
              <div className="fieldLabel">비밀번호</div>
              <input
                type="password"
                className="fieldInput"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
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
