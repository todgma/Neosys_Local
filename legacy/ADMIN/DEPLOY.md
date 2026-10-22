# 관리자(admin) 배포 가이드

- 이미지명: `admin:v1`
- 컨테이너명: `admin`
- 컨테이너 내부 포트: **5003** (Dockerfile `PORT=5003`, `EXPOSE 5003`)
- 서버 배포 경로(예): `/home/realestate/admin/`

> 참고: API 주소는 빌드 시 인라인됩니다(`NEXT_PUBLIC_API_BASE`). 운영 API 주소가 있으면 build에 `--build-arg`로 주입하세요.

---

## 1. 빌드 & 이미지 저장 (로컬/윈도우)

```bash
cd C:\gitlab\realestate_maemuljang\admin

# (기본) 로컬 API 주소로 빌드
docker build -t admin:v1 .

# (운영) API 주소 주입해서 빌드
docker build --build-arg NEXT_PUBLIC_API_BASE=https://api.neosis.kr -t admin:v1 .

# 이미지 tar 저장
docker save admin:v1 -o admin.tar

# 서버로 전송 (경로는 서버 상황에 맞게)
scp C:\gitlab\realestate_maemuljang\admin\admin.tar root@49.247.200.224:/home/realestate/

scp C:\gitlab\realestate_maemuljang\admin\admin.tar root@49.247.200.104:/home/realestate/
```

---

## 2. 최초 배포 (서버)

```bash
cd /home/realestate/admin

# 이미지 로드
docker load -i admin.tar

# 실행 (호스트 5003 → 컨테이너 5003)
docker run -d \
  --name admin \
  -p 5003:5003 \
  --restart unless-stopped \
  admin:v1
```

---

## 3. 재배포 (서버)

```bash
cd /home/realestate/admin

# 기존 컨테이너 중지/삭제
docker stop admin
docker rm admin

# 기존 이미지 삭제
docker rmi admin:v1

# 새 이미지 로드
docker load -i admin.tar

# 재실행
docker run -d \
  --name admin \
  -p 5003:5003 \
  --restart unless-stopped \
  admin:v1
```

---

## 4. 확인 / 로그

```bash
docker ps | grep admin
docker logs -f admin
# 헬스: 브라우저/curl 로 http://서버IP:5003 접속
```

> 호스트 포트를 바꾸려면 `-p <호스트포트>:5003` 만 조정하면 됩니다. (예: 외부 6003 → `-p 6003:5003`)
