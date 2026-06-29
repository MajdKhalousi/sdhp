-- CreateTable
CREATE TABLE "prescription_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prescription_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "instructions" TEXT,
    "quantity" INTEGER,
    "refillsLeft" INTEGER,

    CONSTRAINT "prescription_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescription_templates_organizationId_idx" ON "prescription_templates"("organizationId");

-- CreateIndex
CREATE INDEX "prescription_template_items_templateId_idx" ON "prescription_template_items"("templateId");

-- AddForeignKey
ALTER TABLE "prescription_templates" ADD CONSTRAINT "prescription_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_template_items" ADD CONSTRAINT "prescription_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "prescription_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
