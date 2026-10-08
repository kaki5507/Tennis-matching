-- 방문 통계 집계(기간 내 고유 방문자 수) 속도 개선
CREATE INDEX IF NOT EXISTS "page_views_created_at_visitor_id_idx" ON "page_views"("created_at", "visitor_id");
