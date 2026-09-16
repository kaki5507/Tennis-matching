-- CreateTable
CREATE TABLE "banned_identities" (
    "id" UUID NOT NULL,
    "ci_di" TEXT NOT NULL,
    "reason" TEXT,
    "banned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banned_identities_ci_di_key" ON "banned_identities"("ci_di");
