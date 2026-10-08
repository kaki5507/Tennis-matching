-- 복식 모집 인원(방장 제외) 선택
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "recruit_count" INTEGER;
