-- 직원 허용 메뉴 키
-- from legacy/API/Realestater/Services/StaffMenuPermService.cs GetPerm
SELECT menu_key FROM rt_menu_perm WHERE rt_no = @rt_no AND allowed = 'Y';
