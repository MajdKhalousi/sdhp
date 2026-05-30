import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { UpsertClinicSettingsDto } from './dto/upsert-clinic-settings.dto';
import { UpsertWorkingDaysDto } from './dto/upsert-working-days.dto';

const WORKING_DAY_SELECT = {
  id: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  isOpen: true,
} as const;

const SETTINGS_SELECT = {
  id: true,
  organizationId: true,
  defaultSlotMin: true,
  lunchStartTime: true,
  lunchEndTime: true,
  timezone: true,
  updatedAt: true,
  workingDays: {
    select: WORKING_DAY_SELECT,
    orderBy: { dayOfWeek: 'asc' as const },
  },
} as const;

@Injectable()
export class ClinicSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(caller: JwtPayload) {
    return this.prisma.clinicSettings.findUnique({
      where: { organizationId: caller.organizationId },
      select: SETTINGS_SELECT,
    });
  }

  async upsertSettings(dto: UpsertClinicSettingsDto, caller: JwtPayload) {
    return this.prisma.clinicSettings.upsert({
      where: { organizationId: caller.organizationId },
      create: { organizationId: caller.organizationId, ...dto },
      update: { ...dto },
      select: SETTINGS_SELECT,
    });
  }

  async upsertWorkingDays(dto: UpsertWorkingDaysDto, caller: JwtPayload) {
    const settings = await this.prisma.clinicSettings.findUnique({
      where: { organizationId: caller.organizationId },
      select: { id: true },
    });
    if (!settings) {
      throw new BadRequestException(
        'Clinic settings must be created before configuring working days',
      );
    }

    await this.prisma.$transaction([
      this.prisma.clinicWorkingDay.deleteMany({
        where: { clinicSettingsId: settings.id },
      }),
      this.prisma.clinicWorkingDay.createMany({
        data: dto.days.map((d) => ({
          clinicSettingsId: settings.id,
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          isOpen: d.isOpen ?? true,
        })),
      }),
    ]);

    return this.prisma.clinicSettings.findUnique({
      where: { organizationId: caller.organizationId },
      select: SETTINGS_SELECT,
    });
  }
}
