ALTER TABLE "users" ADD COLUMN "court_alert_times" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
