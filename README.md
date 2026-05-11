# TodayPick

TodayPick은 지역, 동행 유형, 분위기, 예산을 기준으로 오늘 갈 만한 장소를 추천하는 웹 서비스입니다. 리뷰, 커뮤니티 추천글, 신고/차단, 관리자 대시보드, 보안 이벤트 기록을 포함합니다.

## 주요 기능

- 지역별 장소 추천
- AI 질문 기반 추천 흐름
- 장소 상세 정보: 추천 시간, 혼잡도, 비 오는 날 대체 코스, 예상 소요 시간
- 장소 리뷰와 별점
- 커뮤니티 추천글, 신고, 관리자 검토
- 관리자 계정 변경, 사용자 차단, 보안 이벤트 확인
- AdSense 연결 스크립트와 `ads.txt` 자동 제공
- `robots.txt`, `sitemap.xml`, canonical/OG 메타 태그

## 로컬 실행

```bash
npm install
cp .env.example .env
npm start
```

접속 주소:

```txt
https://localhost:3000
```

기본 관리자 계정:

```txt
admin@example.com
Admin1234!
```

## 운영 환경 변수

운영 배포 전 `.env` 또는 배포 플랫폼 환경 변수에 아래 값을 설정하세요.

```txt
NODE_ENV=production
SITE_URL=https://todaypick.com
ALLOWED_ORIGINS=https://todaypick.com,https://www.todaypick.com
USE_HTTPS=false
TRUST_PROXY=true
COOKIE_SECURE=auto
SHOW_DEV_EMAIL_CODE=false
SESSION_SECRET=32자_이상의_랜덤_문자열

ADMIN_EMAIL=운영자_이메일
ADMIN_PASSWORD=강한_관리자_비밀번호
ADMIN_NAME=관리자
ADMIN_ID=admin
ADMIN_NICKNAME=운영자

ADSENSE_CLIENT_ID=ca-pub-0000000000000000
ADSENSE_DIRECT_ACCOUNT=DIRECT
```

`ADSENSE_CLIENT_ID`를 비워두면 AdSense 스크립트와 `/ads.txt`가 활성화되지 않습니다. 실제 AdSense 계정에서 발급받은 `ca-pub-...` 값을 넣으면 주요 공개 페이지의 `<head>`에 연결 스크립트가 자동 삽입되고, `/ads.txt`는 아래 형식으로 응답합니다.

```txt
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

## AdSense 승인 준비

- `todaypick.com`이 실제 배포 페이지로 열려야 합니다.
- `about.html`, `guide.html`, `privacy.html`, `terms.html`, `contact.html`이 공개되어 있어야 합니다.
- `contact@todaypick.com` 메일을 실제 수신 가능한 주소로 연결하세요.
- 빈 광고 자리나 클릭 유도 문구를 노출하지 마세요.
- AdSense에서 사이트를 추가한 뒤 발급받은 Publisher ID를 `ADSENSE_CLIENT_ID`에 설정하세요.
- 배포 후 `https://todaypick.com/ads.txt`가 200 OK로 열리는지 확인하세요.

## Render 배포

이 저장소에는 `render.yaml`이 포함되어 있습니다.

1. GitHub 저장소 `https://github.com/minje20221228/todaypick`에 코드를 올립니다.
2. Render에서 New Web Service 또는 Blueprint를 선택합니다.
3. 저장소를 연결하고 `render.yaml` 설정을 사용합니다.
4. 환경 변수 `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADSENSE_CLIENT_ID`를 추가합니다.
5. Render에서 발급한 기본 주소로 동작을 확인합니다.
6. todaypick.com DNS를 Render 안내에 따라 연결하고 HTTPS 발급을 완료합니다.

직접 설정할 경우:

```txt
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

## 배포 후 확인

```txt
https://todaypick.com/
https://todaypick.com/api/health
https://todaypick.com/robots.txt
https://todaypick.com/sitemap.xml
https://todaypick.com/ads.txt
https://todaypick.com/admin.html
```

## 보안 메모

- production에서는 약한 `SESSION_SECRET` 사용 시 서버가 시작되지 않습니다.
- `.env`, SQLite DB, 세션 DB는 public 경로에 두지 않습니다.
- 운영 환경에서는 `SHOW_DEV_EMAIL_CODE=false`를 유지합니다.
- HTTPS를 프록시나 배포 플랫폼에서 종료하면 `TRUST_PROXY=true`, `COOKIE_SECURE=auto`를 사용합니다.
