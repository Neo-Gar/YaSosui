-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "fromTokenKey" TEXT NOT NULL,
    "fromNetwork" TEXT NOT NULL,
    "toTokenKey" TEXT NOT NULL,
    "toNetwork" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "collectedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_expiresAt_idx" ON "public"."Order"("expiresAt");
