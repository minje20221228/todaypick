# GitHub 업로드 및 배포 순서

Repository:

```txt
https://github.com/minje20221228/todaypick
```

## 처음 올릴 때

```bash
cd today-pick-pro-v5
git init
git remote add origin https://github.com/minje20221228/todaypick.git
git add .
git commit -m "Prepare TodayPick for AdSense and deployment"
git branch -M main
git push -u origin main
```

## 이미 Git 저장소가 있을 때

```bash
cd today-pick-pro-v5
git add .
git commit -m "Prepare TodayPick for AdSense and deployment"
git push origin main
```

## Render 배포

1. Render에서 New Blueprint 또는 New Web Service를 선택합니다.
2. `https://github.com/minje20221228/todaypick` 저장소를 연결합니다.
3. `render.yaml`을 사용하거나 아래 값을 직접 입력합니다.

```txt
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

4. 환경 변수에 `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADSENSE_CLIENT_ID`를 추가합니다.
5. todaypick.com DNS를 Render 안내에 맞춰 연결합니다.

현재 작업 환경에 Git/GitHub 인증이 없으면 직접 push할 수 없으므로, GitHub Desktop 또는 로컬 터미널에서 위 명령을 실행하세요.
