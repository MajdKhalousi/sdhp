import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RadiologyService } from './radiology.service';
import { CreateRadiologyOrderDto } from './dto/create-radiology-order.dto';
import { UpdateRadiologyOrderStatusDto } from './dto/update-radiology-order-status.dto';
import { UpsertRadiologyReportDto } from './dto/upsert-radiology-report.dto';
import { RadiologyQueryDto } from './dto/radiology-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresActiveSubscription } from '../../common/decorators/requires-active-subscription.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Radiology')
@ApiBearerAuth()
@Controller('radiology-orders')
export class RadiologyController {
  constructor(private readonly service: RadiologyService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @RequiresActiveSubscription()
  @ApiOperation({ summary: 'Create a radiology order. orderedById auto-resolved for DOCTOR.' })
  @ApiCreatedResponse({ description: 'Radiology order created' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  create(@Body() dto: CreateRadiologyOrderDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.TECHNICIAN,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'List radiology orders. Filterable by status, patientId, branchId, date range.' })
  @ApiOkResponse({ description: 'Radiology order list' })
  findAll(@Query() query: RadiologyQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.TECHNICIAN,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'Get a single radiology order with nested report' })
  @ApiOkResponse({ description: 'Radiology order returned' })
  @ApiNotFoundResponse({ description: 'Radiology order not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id/status')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.TECHNICIAN)
  @ApiOperation({
    summary:
      'Advance workflow status. NURSE: ORDERED→SCHEDULED only. TECHNICIAN: SCHEDULED→IN_PROGRESS only. DOCTOR: ORDERED→SCHEDULED or cancel own orders.',
  })
  @ApiOkResponse({ description: 'Status updated' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRadiologyOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateStatus(id, dto, user);
  }

  @Patch(':id/report')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Enter or update radiology report. Order must be IN_PROGRESS. Atomically transitions to RESULTED.',
  })
  @ApiOkResponse({ description: 'Report recorded and order transitioned to RESULTED' })
  upsertReport(
    @Param('id') id: string,
    @Body() dto: UpsertRadiologyReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsertReport(id, dto, user);
  }

  @Patch(':id/review')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Mark report as reviewed. Order must be RESULTED. Atomically transitions to REVIEWED.',
  })
  @ApiOkResponse({ description: 'Report reviewed and order transitioned to REVIEWED' })
  reviewReport(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.reviewReport(id, user);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Soft delete a radiology order. DOCTOR can only delete their own orders.' })
  @ApiOkResponse({ description: 'Radiology order soft-deleted' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or not own order (DOCTOR)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}

@ApiTags('Radiology')
@ApiBearerAuth()
@Controller('patients')
export class PatientRadiologyOrdersController {
  constructor(private readonly service: RadiologyService) {}

  @Get(':patientId/radiology-orders')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.TECHNICIAN,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'List all radiology orders for a patient' })
  @ApiOkResponse({ description: 'Patient radiology order list' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findByPatient(
    @Param('patientId') patientId: string,
    @Query() query: RadiologyQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findByPatient(patientId, query, user);
  }
}
