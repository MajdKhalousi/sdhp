-- CreateIndex
CREATE INDEX "encounters_organizationId_followUpDate_idx" ON "encounters"("organizationId", "followUpDate");

-- CreateIndex
CREATE INDEX "encounters_organizationId_doctorId_followUpDate_idx" ON "encounters"("organizationId", "doctorId", "followUpDate");
