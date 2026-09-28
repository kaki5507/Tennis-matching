-- AlterTable
ALTER TABLE "users" ADD COLUMN     "level_mismatch_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "court_watches" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "facility_id" TEXT NOT NULL,
    "facility_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_availability_snapshots" (
    "id" UUID NOT NULL,
    "facility_id" TEXT NOT NULL,
    "available_keys" TEXT[],
    "checked_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_availability_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "court_watches_user_id_facility_id_key" ON "court_watches"("user_id", "facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "court_availability_snapshots_facility_id_key" ON "court_availability_snapshots"("facility_id");
