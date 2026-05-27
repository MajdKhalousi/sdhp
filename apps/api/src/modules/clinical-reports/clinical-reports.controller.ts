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
import { ClinicalReportsService } from './clinical-reports.service';
import { CreateClinicalReportDto } from './dto/create-clinical-report.dto';
import { UpdateClinicalReportDto } from './dto/update-clinical-report.dto';
import { QueryClinicalReportsDto } from './dto/query-clinical-reports.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Clinical Reports')
@ApiBearerAuth()
@Controller('clinical-reports')
export class ClinicalReportsController {
  constructor(private readonly service: ClinicalReportsService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create a clinical report. organizationId and createdById auto-resolved from JWT.' })
  @ApiCreatedResponse({ description: 'Clinical report created' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  create(@Body() dto: CreateClinicalReportDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'List clinical reports. Filterable by patient, encounter, status, creator.' })
  @ApiOkResponse({ description: 'Report list' })
  findAll(@Query() query: QueryClinicalReportsDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'Get a single clinical report with patient, encounter, and author' })
  @ApiOkResponse({ description: 'Clinical report returned' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update a clinical report. DOCTOR may only edit their own DRAFT. Finalized reports are immutable.' })
  @ApiOkResponse({ description: 'Clinical report updated' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access, not own report (DOCTOR), or report is finalized' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClinicalReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Soft delete a clinical report. DOCTOR can only delete their own DRAFT. Finalized reports cannot be deleted.' })
  @ApiOkResponse({ description: 'Clinical report soft-deleted' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access, not own report (DOCTOR), or report is finalized' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}

@ApiTags('Clinical Reports')
@ApiBearerAuth()
@Controller('patients')
export class PatientClinicalReportsController {
  constructor(private readonly service: ClinicalReportsService) {}

  @Get(':patientId/clinical-reports')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'List all clinical reports for a patient' })
  @ApiOkResponse({ description: 'Patient clinical report list' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findByPatient(
    @Param('patientId') patientId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findByPatient(patientId, user);
  }
}
