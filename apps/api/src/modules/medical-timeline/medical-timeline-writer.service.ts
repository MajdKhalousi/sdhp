import { Injectable, Logger } from '@nestjs/common';
import { MedicalTimelineEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface TimelineWriteInput {
  organizationId: string;
  patientId: string;
  eventType: MedicalTimelineEventType;
  createdById?: string | null;
  metadata?: Prisma.InputJsonObject | null;
}

@Injectable()
export class MedicalTimelineWriterService {
  private readonly logger = new Logger(MedicalTimelineWriterService.name);

  constructor(private prisma: PrismaService) {}

  async log(input: TimelineWriteInput): Promise<void> {
    try {
      await this.prisma.medicalTimelineEvent.create({
        data: {
          organizationId: input.organizationId,
          patientId: input.patientId,
          eventType: input.eventType,
          createdById: input.createdById ?? null,
          metadata: input.metadata ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      this.logger.error(
        `Timeline write failed — eventType=${input.eventType} patientId=${input.patientId}`,
        err instanceof Error ? err.stack : String(err),
      );
      // never rethrow — primary operation must not fail if timeline write fails
    }
  }
}
