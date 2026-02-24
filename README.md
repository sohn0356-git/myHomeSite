# Attendance Board

React + Vite 기반 출석 관리 앱입니다.

## Features

- 주간 출석 체크
- 연간 출석표(컴팩트 매트릭스)
- 학생 프로필 관리
- Firebase Realtime Database 실시간 동기화
- Firebase Storage 사진 업로드/삭제

## Local Development

```bash
npm install
npm run dev
```

## Firebase Setup

1. Firebase 프로젝트 생성
2. Realtime Database 활성화
3. Storage 활성화
4. Web App 등록 후 설정값 복사
5. `.env.example`을 복사해서 `.env` 생성 후 값 입력

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

환경변수가 모두 설정되면 Firebase 동기화가 자동으로 활성화됩니다.
설정이 없으면 앱은 로컬(localStorage) 모드로 동작합니다.
