-- 네오봇 상담이력 검색 — 전화번호(숫자) 또는 내용·성함.
--  물건·고객에 같은 상담이 함께 저장된 경우 1건만(전화·일자·작성자·내용·작성시각 기준 대표 1건)
-- from legacy/API/Neobot/Services/NeobotService.cs SearchConsultations
SELECT * FROM ct_interview
 WHERE itv_no IN (
   SELECT MAX(itv_no) FROM ct_interview
    WHERE (off_no = @session_off_no OR off_no IS NULL OR @session_off_no IS NULL)
      AND ((length(digits(@q)) > 0 AND digits(COALESCE(contact_phone, '')) LIKE '%' || digits(@q) || '%')
           OR (length(digits(@q)) > 0 AND digits(COALESCE(cust_phone, '')) LIKE '%' || digits(@q) || '%')
           OR itv_content LIKE '%' || @q || '%' OR contact_name LIKE '%' || @q || '%' OR cust_name LIKE '%' || @q || '%')
    GROUP BY digits(COALESCE(contact_phone, '')), itv_date, COALESCE(reg_id, ''), COALESCE(itv_content, ''), reg_dt)
 ORDER BY itv_no DESC LIMIT @q_limit;
