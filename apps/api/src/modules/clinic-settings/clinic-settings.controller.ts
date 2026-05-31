import { Body, Controller, Get, Put, Res, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { ClinicSettingsService } from './clinic-settings.service';
import { UpsertClinicSettingsDto } from './dto/upsert-clinic-settings.dto';
import { UpsertWorkingDaysDto } from './dto/upsert-working-days.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Clinic Settings')
@ApiBearerAuth()
@Controller('clinic-settings')
export class ClinicSettingsController {
  constructor(private readonly service: ClinicSettingsService) {}

  @Get()
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'Get clinic settings and working hours' })
  @ApiOkResponse({ description: 'Clinic settings returned (null if not yet configured)' })
  async getSettings(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    // NestJS serializes a null controller return as an empty body (not JSON null).
    // Using @Res() ensures res.json(null) sends the literal JSON null the client expects.
    const result = await this.service.getSettings(user);
    res.json(result ?? null);
  }

  @Put()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Create or update clinic settings' })
  @ApiOkResponse({ description: 'Clinic settings upserted' })
  upsertSettings(
    @Body() dto: UpsertClinicSettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsertSettings(dto, user);
  }

  @Put('working-days')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Replace all working day configurations' })
  @ApiOkResponse({ description: 'Working days replaced' })
  upsertWorkingDays(
    @Body() dto: UpsertWorkingDaysDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsertWorkingDays(dto, user);
  }
}
