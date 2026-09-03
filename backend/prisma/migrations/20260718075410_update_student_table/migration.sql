/*
  Warnings:

  - You are about to drop the column `profilePhoto` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `section` on the `Student` table. All the data in the column will be lost.
  - Added the required column `division` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_userId_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "profilePhoto",
DROP COLUMN "section",
ADD COLUMN     "division" TEXT NOT NULL,
ADD COLUMN     "faceRegistered" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
