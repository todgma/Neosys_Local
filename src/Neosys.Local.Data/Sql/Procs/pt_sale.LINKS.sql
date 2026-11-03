-- 물건 연동 정보 건수 — 삭제 전 확인용: 연결된 일정(사용중)·사진·평면도(사용중)
-- from legacy/API/Property/Services/PropertyServices.cs DeleteProperty (기존은 연동을 확인하지 않음 — 로컬 추가)
SELECT (SELECT count(*) FROM rt_schedule_link l JOIN rt_schedule s ON s.schedule_id = l.schedule_id AND s.use_yn = 'Y'
         WHERE l.link_type = 'PT' AND l.link_key = CAST(@pt_no AS TEXT)) AS schedule_cnt,
       (SELECT count(*) FROM sys_file
         WHERE use_yn = 'Y' AND ref_key = CAST(@pt_no AS TEXT) AND file_div IN ('SYFDV01', 'SYFDV05')) AS file_cnt;
