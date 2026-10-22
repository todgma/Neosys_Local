-- 좌측 '물건리스트' — 단지 물건은 단지별로 묶고(건수), 단지 없는 물건은 1건씩(물건명 없으면 화면에서 읍면동+유형). 건수 많은 순
-- from legacy/API/Property/Services/PropertyServices.cs SelectPropertyList (summarySql)
SELECT * FROM (
    SELECT a.danji_code AS danji_code,
           COALESCE(MAX(NULLIF(a.addr4, '')), a.danji_code) AS display_name,
           a.danji_code AS group_key,
           NULL AS pt_no,
           MAX(a.pt_type) AS pt_type,
           COUNT(*) AS property_count,
           MAX(a.house_cnt) AS family_cnt,
           NULL AS addr3
      FROM pt_sale a
     WHERE COALESCE(a.danji_code, '') <> ''
       AND (a.off_no = @session_off_no OR a.off_no IS NULL OR @session_off_no IS NULL)
       AND (@q_pt_type IS NULL OR (',' || @q_pt_type || ',') LIKE ('%,' || a.pt_type || ',%'))
       AND (@q_pt_sts IS NULL OR a.pt_sts LIKE '%' || @q_pt_sts || '%')
     GROUP BY a.danji_code
    UNION ALL
    SELECT NULL, NULLIF(a.pt_name, ''), 'PT_' || a.pt_no, a.pt_no, a.pt_type, 1, NULL, a.addr3
      FROM pt_sale a
     WHERE COALESCE(a.danji_code, '') = ''
       AND (a.off_no = @session_off_no OR a.off_no IS NULL OR @session_off_no IS NULL)
       AND (@q_pt_type IS NULL OR (',' || @q_pt_type || ',') LIKE ('%,' || a.pt_type || ',%'))
       AND (@q_pt_sts IS NULL OR a.pt_sts LIKE '%' || @q_pt_sts || '%')
) x
ORDER BY property_count DESC, display_name;
