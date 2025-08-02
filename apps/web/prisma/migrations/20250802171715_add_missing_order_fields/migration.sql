-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "orderHash" TEXT,
ADD COLUMN     "secrets" TEXT,
ADD COLUMN     "signature" TEXT;
