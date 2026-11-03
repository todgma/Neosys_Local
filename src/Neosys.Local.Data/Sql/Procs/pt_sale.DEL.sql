-- 물건 삭제 — 딸린 소유자·공동중개사·메모·임대차현황·필지도 함께 삭제(기존은 pt_sale만 지워 고아 행이 남았음)
--  일정 연동·사진·평면도는 사용자에게 물어 본 뒤 pt_sale.DEL_LINKS로 따로 지운다(PropertyService.DeleteAsync deleteLinks)
--  상담이력(ct_interview.pt_no)은 상담관리 메뉴의 기록이라 남긴다(고객 삭제와 같은 규칙)
-- from legacy/API/Property/Services/PropertyServices.cs DeleteProperty
DELETE FROM pt_sale_holder     WHERE pt_no = @pt_no;
DELETE FROM pt_share           WHERE pt_no = @pt_no;
DELETE FROM pt_memo            WHERE pt_no = @pt_no;
DELETE FROM pt_lease_status    WHERE pt_no = @pt_no;
DELETE FROM pt_land_additional WHERE pt_no = @pt_no;
DELETE FROM pt_sale            WHERE pt_no = @pt_no;
