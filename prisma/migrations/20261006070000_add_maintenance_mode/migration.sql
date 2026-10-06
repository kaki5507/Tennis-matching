-- CreateTable
CREATE TABLE "maintenance_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "ends_at" TIMESTAMP(3),
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_settings_pkey" PRIMARY KEY ("id")
);
