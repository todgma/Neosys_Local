-- pt_sale_holder 테이블에 관계, 비고 컬럼 추가

-- 관계 컬럼 추가 (소유자와의 관계: 본인, 배우자, 자녀, 부모, 기타 등)
ALTER TABLE pt_sale_holder
ADD COLUMN IF NOT EXISTS holder_relation VARCHAR(50);

-- 비고(메모) 컬럼 추가
ALTER TABLE pt_sale_holder
ADD COLUMN IF NOT EXISTS holder_memo TEXT;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN pt_sale_holder.holder_relation IS '소유자와의 관계';
COMMENT ON COLUMN pt_sale_holder.holder_memo IS '비고(메모)';
