-- 단지 점유현황(배치도) — 사무소 기준(off_no = 0 은 공용)
-- from legacy/API/Property/Services/LayoutService.cs GetAllLayoutDataAsync
SELECT * FROM danji_occupancy
 WHERE naver_danji_code = @naver_danji_code
   AND (off_no = COALESCE(@session_off_no, 0) OR off_no = 0)
 ORDER BY dong_no, ho_number DESC;
