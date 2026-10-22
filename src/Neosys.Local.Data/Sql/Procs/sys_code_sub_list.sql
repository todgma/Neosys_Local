-- 공통코드 전체(사용 중) — CodeService가 시작 시 캐시
-- from legacy/API/System/Services/SysCodeServices.cs
SELECT cat_cd, mid_cd, sub_cd, sub_nm, etc1, etc2, etc3, sort
  FROM sys_code_sub
 WHERE COALESCE(use_yn, 'Y') = 'Y'
 ORDER BY cat_cd, mid_cd, sort, sub_cd;
