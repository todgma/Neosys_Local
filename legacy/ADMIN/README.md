# 네오시스 관리자 웹 (admin)

Next.js(App Router) 관리자 사이트. **포트 3003**. RealestateAPI(.NET)는 그대로 두고 이 웹만 추가됩니다.

## 실행
```bash
cd admin
npm install
npm run dev      # http://localhost:3003
```
API 주소는 `.env.local`의 `NEXT_PUBLIC_API_BASE` (기본 http://localhost:5073).

## 메뉴
1. 회원관리 — `/members` (GET /api/admin/members)
2. 공지사항관리 — `/notices` (GET/POST/PUT/DELETE /api/admin/notices)
3. 멤버십 상품관리 — `/memberships` (GET/POST/PUT/DELETE /api/admin/memberships, 사무소 배정 /office/{offNo})
4. 단지관리 — `/danji` (GET /api/admin/danji, /{code}/ho, POST/PUT/DELETE, /ho upsert·delete)

## 선행: DB DDL
- `back/Admin/membership_ddl.sql` — membership_product / office_membership 테이블 생성

## 로그인 게이트
- 대표중개사(RTTYP01)는 사무소에 배정된 멤버십 상품이 없으면 메인 로그인 불가.
- 소속중개사는 대표(같은 off_no)의 멤버십을 그대로 따름.
