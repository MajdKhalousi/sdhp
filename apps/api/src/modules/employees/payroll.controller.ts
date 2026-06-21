import { Body, Controller, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PayrollService } from './payroll.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { PayrollRunQueryDto } from './dto/payroll-run-query.dto';
import { UpdatePayrollLineDto } from './dto/update-payroll-line.dto';
import { CancelPayrollRunDto } from './dto/cancel-payroll-run.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

// No @RequiresActiveSubscription() — HR record-keeping is administrative,
// exempt from the subscription write guard like the rest of the
// EmployeeProfile module (see Phase 144A/144B/144C). ACCOUNTANT and clinical
// roles deliberately have zero access this phase, same strictness as the
// rest of HR (Phase 147A/147B). This is bookkeeping only — no payment
// execution, no invoice/cashier integration (Phase 148A/148B).
@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payroll/runs')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Generate a DRAFT payroll run for one organization/year/month, snapshotting active employees.' })
  @ApiCreatedResponse({ description: 'Payroll run created with lines for every eligible employee' })
  @ApiBadRequestResponse({ description: 'No eligible employees found' })
  @ApiConflictResponse({ description: 'A run already exists for this organization/year/month' })
  create(@Body() dto: CreatePayrollRunDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: "List the caller's organization's payroll runs, optionally filtered by year/month/status." })
  @ApiOkResponse({ description: 'Paginated payroll run list, org-scoped' })
  findAll(@Query() query: PayrollRunQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAllForOrg(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Get one payroll run with its lines and minimal employee info.' })
  @ApiOkResponse({ description: 'Payroll run with lines' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Payroll run not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id/lines/:lineId')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Edit additions/deductions/notes on one line. Only while the run is DRAFT.' })
  @ApiOkResponse({ description: 'Payroll line updated, netSalary recomputed server-side' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Payroll run or line not found' })
  @ApiBadRequestResponse({ description: 'Run is not in DRAFT status' })
  updateLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdatePayrollLineDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateLine(id, lineId, dto, user);
  }

  @Patch(':id/approve')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Approve a DRAFT payroll run.' })
  @ApiOkResponse({ description: 'Payroll run approved' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Payroll run not found' })
  @ApiBadRequestResponse({ description: 'Run is not in DRAFT status' })
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.approve(id, user);
  }

  @Patch(':id/mark-paid')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Mark an APPROVED payroll run as PAID. Bookkeeping only — does not execute a real payment.' })
  @ApiOkResponse({ description: 'Payroll run marked as paid' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Payroll run not found' })
  @ApiBadRequestResponse({ description: 'Run is not in APPROVED status' })
  markPaid(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markPaid(id, user);
  }

  @Patch(':id/cancel')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Cancel a DRAFT or APPROVED payroll run.' })
  @ApiOkResponse({ description: 'Payroll run cancelled' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Payroll run not found' })
  @ApiBadRequestResponse({ description: 'Run is not in DRAFT or APPROVED status' })
  cancel(@Param('id') id: string, @Body() dto: CancelPayrollRunDto, @CurrentUser() user: JwtPayload) {
    return this.service.cancel(id, dto, user);
  }
}
