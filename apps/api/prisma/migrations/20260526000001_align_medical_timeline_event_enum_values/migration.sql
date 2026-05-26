-- Rename PostgreSQL enum values to match current schema.prisma
-- RADIOLOGY_RESULT_ADDED was the original value; schema now uses RADIOLOGY_REPORT_ADDED
-- FILE_UPLOADED was the original value; schema now uses MEDICAL_FILE_UPLOADED

ALTER TYPE "MedicalTimelineEventType" RENAME VALUE 'RADIOLOGY_RESULT_ADDED' TO 'RADIOLOGY_REPORT_ADDED';

ALTER TYPE "MedicalTimelineEventType" RENAME VALUE 'FILE_UPLOADED' TO 'MEDICAL_FILE_UPLOADED';
