import { Controller, Get, Query, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { TodayHubQueryDto } from './dto/today-hub-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.SECRETARY,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.ACCOUNTANT,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({
    summary:
      'Today-scoped operational dashboard metrics — appointments, queue, follow-ups due, pending labs/radiology, new patients, billing (billing roles only). DOCTOR response is scoped to own patients.',
  })
  @ApiOkResponse({ description: 'Dashboard overview metrics' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  getOverview(@Query() query: DashboardQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.getOverview(query, user);
  }

  @Get('today')
  @Version('1')
  @Roles(
    UserRole.ORG_ADMIN,
    UserRole.SECRETARY,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({
    summary:
      'Today Hub — read-only consolidated visit rows for today. Each entry combines appointment + patient + doctor + queue + latest encounter + latest invoice. DOCTOR response is scoped to own appointments. SUPER_ADMIN receives 403.',
  })
  @ApiOkResponse({ description: 'Today\'s visit rows with summary counts' })
  @ApiForbiddenResponse({ description: 'SUPER_ADMIN blocked in V1; cross-org access denied' })
  getTodayHub(@Query() query: TodayHubQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.getTodayHub(query, user);
  }
}
