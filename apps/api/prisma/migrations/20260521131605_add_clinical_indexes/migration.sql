-- CreateIndex
CREATE INDEX "encounters_organizationId_idx" ON "encounters"("organizationId");

-- CreateIndex
CREATE INDEX "encounters_doctorId_idx" ON "encounters"("doctorId");

-- CreateIndex
CREATE INDEX "encounters_patientId_idx" ON "encounters"("patientId");

-- CreateIndex
CREATE INDEX "prescriptions_encounterId_idx" ON "prescriptions"("encounterId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
