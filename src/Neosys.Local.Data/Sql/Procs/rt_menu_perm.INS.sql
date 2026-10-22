-- 직원 허용 메뉴 키 1건
-- from legacy/API/Realestater/Services/StaffMenuPermService.cs SetPerm
INSERT INTO rt_menu_perm (rt_no, menu_key, allowed, reg_id, reg_dt)
VALUES (@rt_no, @menu_key, 'Y', @session_user_id, datetime('now','localtime'))
ON CONFLICT (rt_no, menu_key) DO UPDATE SET allowed = 'Y', upd_dt = datetime('now','localtime');
