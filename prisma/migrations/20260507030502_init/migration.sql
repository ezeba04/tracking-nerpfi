-- CreateTable
CREATE TABLE "TeamMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "codeforcesHandle" TEXT,
    "csesUsername" TEXT,
    "csesUserId" TEXT
);

-- CreateTable
CREATE TABLE "CfContest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "type" TEXT,
    "phase" TEXT
);

-- CreateTable
CREATE TABLE "CfProblem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contestId" INTEGER NOT NULL,
    "problemIndex" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" INTEGER,
    "tags" TEXT,
    "url" TEXT NOT NULL,
    CONSTRAINT "CfProblem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "CfContest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CfSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contestId" INTEGER NOT NULL,
    "problemId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "timeMs" INTEGER,
    "memoryBytes" INTEGER,
    "language" TEXT,
    "passedTests" INTEGER,
    "createdAt" INTEGER NOT NULL,
    "relativeTime" INTEGER,
    "isDuringContest" BOOLEAN NOT NULL DEFAULT false,
    "sourceCode" TEXT,
    CONSTRAINT "CfSubmission_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "CfContest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CfSubmission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "CfProblem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CfSubmission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CsesProblem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "csesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "url" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CsesSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "csesSubmissionId" TEXT NOT NULL,
    "problemId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "timeMs" INTEGER,
    "memoryKb" INTEGER,
    "language" TEXT,
    "createdAt" TEXT,
    "sourceCode" TEXT,
    CONSTRAINT "CsesSubmission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "CsesProblem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CsesSubmission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "newItems" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_codeforcesHandle_key" ON "TeamMember"("codeforcesHandle");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_csesUsername_key" ON "TeamMember"("csesUsername");

-- CreateIndex
CREATE UNIQUE INDEX "CfProblem_contestId_problemIndex_key" ON "CfProblem"("contestId", "problemIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CsesProblem_csesId_key" ON "CsesProblem"("csesId");

-- CreateIndex
CREATE UNIQUE INDEX "CsesSubmission_csesSubmissionId_key" ON "CsesSubmission"("csesSubmissionId");
