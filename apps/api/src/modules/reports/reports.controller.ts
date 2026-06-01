import { Controller, Get, Query, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary:
      'Full operational summary — staff, patients, appointments, queue, encounters, prescriptions. SUPER_ADMIN sees all orgs unless organizationId is passed.',
  })
  @ApiOkResponse({ description: 'Aggregated summary metrics' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  getSummary(@Query() query: ReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.getSummary(query, user);
  }

  @Get('appointments')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Appointment breakdown — totals, today, upcoming, byStatus, cancelled, completed, no-show.',
  })
  @ApiOkResponse({ description: 'Appointment statistics' })
  getAppointments(@Query() query: ReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.getAppointmentsReport(query, user);
  }

  @Get('clinical')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Clinical summary — encounter totals with diagnosis/treatment breakdown, prescription totals.',
  })
  @ApiOkResponse({ description: 'Clinical statistics' })
  getClinical(@Query() query: ReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.getClinicalReport(query, user);
  }

  @Get('queue')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Queue breakdown — total and per-status counts (WAITING, CALLED, IN_PROGRESS, DONE, SKIPPED).',
  })
  @ApiOkResponse({ description: 'Queue statistics' })
  getQueue(@Query() query: ReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.getQueueReport(query, user);
  }

  @Get('billing')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary:
      'Billing summary — totalInvoiced, totalCollected, totalOutstanding, collectionRate, invoice status counts. Period filtered by issuedAt. totalOutstanding is always all-time.',
  })
  @ApiOkResponse({ description: 'Billing summary metrics' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  getBillingReport(@Query() query: ReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.getBillingReport(query, user);
  }
}
