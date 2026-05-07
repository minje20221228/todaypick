# GitHub 업로드 방법

이 프로젝트를 아래 저장소에 올리는 명령어입니다.

Repository:
https://github.com/minje20221228/today-pick

## 처음 올릴 때

```bash
git clone https://github.com/minje20221228/today-pick.git
cd today-pick

# 압축을 푼 프로젝트 파일을 이 폴더에 복사한 뒤
git add .
git commit -m "Update login signup email verification"
git push origin main
```

## 이미 로컬 저장소가 있을 때

```bash
git add .
git commit -m "Update login signup email verification"
git push origin main
```

## 주의

ChatGPT는 사용자의 GitHub 계정 인증 토큰에 접근할 수 없어서 직접 push는 할 수 없습니다.
GitHub Desktop을 쓰는 경우에는 파일 복사 후 Commit to main → Push origin을 누르면 됩니다.
