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
import { LabsService } from './labs.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UpdateLabOrderStatusDto } from './dto/update-lab-order-status.dto';
import { UpsertLabResultDto } from './dto/upsert-lab-result.dto';
import { LabQueryDto } from './dto/lab-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresActiveSubscription } from '../../common/decorators/requires-active-subscription.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Labs')
@ApiBearerAuth()
@Controller('lab-orders')
export class LabsController {
  constructor(private readonly service: LabsService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @RequiresActiveSubscription()
  @ApiOperation({ summary: 'Create a lab order. orderedById auto-resolved for DOCTOR.' })
  @ApiCreatedResponse({ description: 'Lab order created' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  create(@Body() dto: CreateLabOrderDto, @CurrentUser() user: JwtPayload) {
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
  @ApiOperation({ summary: 'List lab orders. Filterable by status, patientId, branchId, date range.' })
  @ApiOkResponse({ description: 'Lab order list' })
  findAll(@Query() query: LabQueryDto, @CurrentUser() user: JwtPayload) {
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
  @ApiOperation({ summary: 'Get a single lab order with nested result' })
  @ApiOkResponse({ description: 'Lab order returned' })
  @ApiNotFoundResponse({ description: 'Lab order not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id/status')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.TECHNICIAN)
  @ApiOperation({
    summary:
      'Advance workflow status. NURSE: ORDERED→SAMPLE_COLLECTED only. TECHNICIAN: SAMPLE_COLLECTED→IN_PROGRESS only. DOCTOR: ORDERED→SAMPLE_COLLECTED or cancel own orders.',
  })
  @ApiOkResponse({ description: 'Status updated' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLabOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateStatus(id, dto, user);
  }

  @Patch(':id/result')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Enter or update lab result. Order must be IN_PROGRESS. Atomically transitions to RESULTED.',
  })
  @ApiOkResponse({ description: 'Result recorded and order transitioned to RESULTED' })
  upsertResult(
    @Param('id') id: string,
    @Body() dto: UpsertLabResultDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsertResult(id, dto, user);
  }

  @Patch(':id/review')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Mark result as reviewed. Order must be RESULTED. Atomically transitions to REVIEWED.',
  })
  @ApiOkResponse({ description: 'Result reviewed and order transitioned to REVIEWED' })
  reviewResult(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.reviewResult(id, user);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Soft delete a lab order. DOCTOR can only delete their own orders.' })
  @ApiOkResponse({ description: 'Lab order soft-deleted' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or not own order (DOCTOR)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}

@ApiTags('Labs')
@ApiBearerAuth()
@Controller('patients')
export class PatientLabOrdersController {
  constructor(private readonly service: LabsService) {}

  @Get(':patientId/lab-orders')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.TECHNICIAN,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'List all lab orders for a patient' })
  @ApiOkResponse({ description: 'Patient lab order list' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findByPatient(
    @Param('patientId') patientId: string,
    @Query() query: LabQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findByPatient(patientId, query, user);
  }
}
