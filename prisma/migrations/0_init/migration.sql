-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."MatchStatus" AS ENUM ('OPEN', 'FULL', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."ParticipantStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'NO_SHOW', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."Position" AS ENUM ('FOREHAND', 'BACKHAND', 'ANY');

-- CreateEnum
CREATE TYPE "public"."Team" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "public"."WinLoss" AS ENUM ('WIN', 'LOSS', 'DRAW');

-- CreateTable
CREATE TABLE "public"."MatchChat" (
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "MatchChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "has_parking" BOOLEAN NOT NULL DEFAULT false,
    "has_shower" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evaluations" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "evaluator_id" UUID NOT NULL,
    "evaluatee_id" UUID NOT NULL,
    "manner_rating" INTEGER NOT NULL,
    "win_loss" "public"."WinLoss",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_noshow" BOOLEAN NOT NULL DEFAULT false,
    "ntrp_rating" DECIMAL(3,1) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."match_comments" (
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "id" UUID NOT NULL,

    CONSTRAINT "match_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."match_participants" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "team" "public"."Team",
    "status" "public"."ParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."matches" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "match_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "target_level" TEXT NOT NULL,
    "status" "public"."MatchStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "age_requirement" TEXT NOT NULL DEFAULT 'ANY',
    "cost_per_person" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "game_type" TEXT NOT NULL,
    "gender_requirement" TEXT NOT NULL DEFAULT 'ANY',

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "ci_di" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "tennis_level" TEXT NOT NULL,
    "preferred_pos" "public"."Position" NOT NULL DEFAULT 'ANY',
    "manner_score" DECIMAL(4,1) NOT NULL DEFAULT 36.5,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "birth_year" INTEGER,
    "gender" TEXT,
    "profile_url" TEXT,
    "ntrp_count" INTEGER NOT NULL DEFAULT 0,
    "ntrp_score" DECIMAL(3,1),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchChat_matchId_idx" ON "public"."MatchChat"("matchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_match_id_evaluator_id_evaluatee_id_key" ON "public"."evaluations"("match_id" ASC, "evaluator_id" ASC, "evaluatee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_match_id_user_id_key" ON "public"."match_participants"("match_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_ci_di_key" ON "public"."users"("ci_di" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."MatchChat" ADD CONSTRAINT "MatchChat_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchChat" ADD CONSTRAINT "MatchChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_evaluatee_id_fkey" FOREIGN KEY ("evaluatee_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_comments" ADD CONSTRAINT "match_comments_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_comments" ADD CONSTRAINT "match_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_participants" ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_participants" ADD CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

