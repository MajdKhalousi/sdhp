import { Body, Controller, Get, Put, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
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
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.service.getSettings(user);
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
