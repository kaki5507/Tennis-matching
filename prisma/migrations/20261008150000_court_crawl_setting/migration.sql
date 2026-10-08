-- 빈 코트 크롤링 on/off 설정 (한 줄짜리 설정 테이블)
CREATE TABLE "court_crawl_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_run_summary" TEXT,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_crawl_settings_pkey" PRIMARY KEY ("id")
);
