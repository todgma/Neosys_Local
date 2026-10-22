-- 상담 1건 삭제
-- from legacy/API/Interview/Services/InterviewServices.cs
DELETE FROM ct_interview WHERE itv_no = @itv_no;
