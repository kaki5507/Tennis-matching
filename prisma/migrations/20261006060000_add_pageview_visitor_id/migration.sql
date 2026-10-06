-- AlterTable
ALTER TABLE "page_views" ADD COLUMN     "visitor_id" TEXT;

-- CreateIndex
CREATE INDEX "page_views_visitor_id_idx" ON "page_views"("visitor_id");
