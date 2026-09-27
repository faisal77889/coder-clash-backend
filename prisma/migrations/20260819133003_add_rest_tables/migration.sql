-- CreateEnum
CREATE TYPE "Status" AS ENUM ('processing', 'passed', 'failed');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateTable
CREATE TABLE "Contest" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "total_time" INTEGER NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenges" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty_level" "Difficulty" NOT NULL DEFAULT 'easy',

    CONSTRAINT "Challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tests" (
    "id" SERIAL NOT NULL,
    "folder_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,

    CONSTRAINT "Tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "test_id" INTEGER NOT NULL,
    "status" "Status" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestChallengeMapping" (
    "id" SERIAL NOT NULL,
    "contest_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,

    CONSTRAINT "ContestChallengeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestUserMap" (
    "id" SERIAL NOT NULL,
    "contest_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "ContestUserMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSubmissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contest_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "test_id" INTEGER NOT NULL,
    "time_taken" INTEGER NOT NULL,
    "status" "Status" NOT NULL,

    CONSTRAINT "ContestSubmissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contestUserRanking" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contest_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "time_taken" INTEGER NOT NULL,
    "points_scored" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL,

    CONSTRAINT "contestUserRanking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contest_title_key" ON "Contest"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Challenges_title_key" ON "Challenges"("title");

-- CreateIndex
CREATE UNIQUE INDEX "ContestChallengeMapping_contest_id_challenge_id_key" ON "ContestChallengeMapping"("contest_id", "challenge_id");

-- AddForeignKey
ALTER TABLE "Tests" ADD CONSTRAINT "Tests_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "Challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submissions" ADD CONSTRAINT "Submissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "Challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submissions" ADD CONSTRAINT "Submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submissions" ADD CONSTRAINT "Submissions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "Tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestChallengeMapping" ADD CONSTRAINT "ContestChallengeMapping_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestChallengeMapping" ADD CONSTRAINT "ContestChallengeMapping_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "Challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSubmissions" ADD CONSTRAINT "ContestSubmissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSubmissions" ADD CONSTRAINT "ContestSubmissions_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSubmissions" ADD CONSTRAINT "ContestSubmissions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "Tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSubmissions" ADD CONSTRAINT "ContestSubmissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "Challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestUserRanking" ADD CONSTRAINT "contestUserRanking_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestUserRanking" ADD CONSTRAINT "contestUserRanking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
