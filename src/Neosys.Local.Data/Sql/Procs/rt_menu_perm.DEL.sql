-- 직원 메뉴 권한 전체 삭제(전체 교체 저장의 앞 단계)
-- from legacy/API/Realestater/Services/StaffMenuPermService.cs SetPerm
DELETE FROM rt_menu_perm WHERE rt_no = @rt_no;
