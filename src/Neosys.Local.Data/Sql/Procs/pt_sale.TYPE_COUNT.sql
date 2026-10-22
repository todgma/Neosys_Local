-- 물건유형별 건수(좌측 '모든유형' 표시용) — 사무소/담당자 범위
-- from legacy/API/Property/Services/PropertyServices.cs SelectPropertyList (typeCountSql)
SELECT pt_type, COUNT(*) AS cnt
  FROM pt_sale
 WHERE (off_no = @session_off_no OR off_no IS NULL OR @session_off_no IS NULL)
   AND (@q_rt_no IS NULL OR rt_no = CAST(@q_rt_no AS TEXT))
   AND COALESCE(pt_type, '') <> ''
 GROUP BY pt_type;
