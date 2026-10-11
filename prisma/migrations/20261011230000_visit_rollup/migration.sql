-- 방문 통계 사전 집계: 지난 날짜는 한 번만 계산해서 저장해 두고, 통계 화면은 이 작은 표만 읽습니다.
CREATE TABLE IF NOT EXISTS "visit_rollup_days" (
    "day" DATE NOT NULL,
    "pv" INTEGER NOT NULL,
    "uv" INTEGER NOT NULL,
    CONSTRAINT "visit_rollup_days_pkey" PRIMARY KEY ("day")
);

CREATE TABLE IF NOT EXISTS "visit_day_visitors" (
    "day" DATE NOT NULL,
    "visitor" TEXT NOT NULL,
    CONSTRAINT "visit_day_visitors_pkey" PRIMARY KEY ("day", "visitor")
);

CREATE TABLE IF NOT EXISTS "visit_rollup_hours" (
    "day" DATE NOT NULL,
    "hour" SMALLINT NOT NULL,
    "pv" INTEGER NOT NULL,
    CONSTRAINT "visit_rollup_hours_pkey" PRIMARY KEY ("day", "hour")
);

CREATE TABLE IF NOT EXISTS "visit_rollup_pages" (
    "day" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "pv" INTEGER NOT NULL,
    CONSTRAINT "visit_rollup_pages_pkey" PRIMARY KEY ("day", "path", "device")
);
