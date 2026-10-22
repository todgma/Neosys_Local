-- pt_sale_holder 테이블에 holder_type 컬럼 추가
ALTER TABLE pt_sale_holder
ADD COLUMN holder_type VARCHAR(10);

-- 컬럼 코멘트 추가
COMMENT ON COLUMN pt_sale_holder.holder_type IS '소유주 구분: OWNER(소유자), SELLER(매도/임대인), BUYER(매수/임차인)';

-- 기존 데이터에 기본값 설정 (필요 시)
-- UPDATE pt_sale_holder SET holder_type = 'OWNER' WHERE holder_type IS NULL;
