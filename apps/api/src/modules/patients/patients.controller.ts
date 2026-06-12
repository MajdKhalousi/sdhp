import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PatientsService } from './patients.service';
import { PatientQueryDto } from './dto/patient-query.dto';
import { DuplicateCheckQueryDto } from './dto/duplicate-check-query.dto';
import { PlatformCandidateQueryDto } from './dto/platform-candidate-query.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.SECRETARY, UserRole.NURSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List patients — SUPER_ADMIN: all | others: own org only' })
  findAll(@Query() query: PatientQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get('check-duplicate')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.SECRETARY, UserRole.NURSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Check for potential duplicate patients before create — org-scoped, includes archived' })
  checkDuplicate(@Query() query: DuplicateCheckQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.checkDuplicate(query, user);
  }

  @Get('platform-candidates')
  @Version('1')
  @Roles(UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.SECRETARY, UserRole.NURSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Search platform-wide for masked candidates by nationalId or phone — excludes same-org patients' })
  platformCandidates(@Query() query: PlatformCandidateQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findPlatformCandidates(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.SECRETARY, UserRole.NURSE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get patient by ID — ORG_ADMIN/DOCTOR/SECRETARY/NURSE/ACCOUNTANT restricted to own org' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY)
  @ApiOperation({
    summary:
      'Create patient — MRN is auto-generated if not provided. SUPER_ADMIN must supply organizationId.',
  })
  @ApiConflictResponse({ description: 'MRN already exists in this organization' })
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY)
  @ApiOperation({
    summary:
      'Update patient — ORG_ADMIN/SECRETARY restricted to own org. organizationId and mrn cannot be changed.',
  })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Patient soft-deleted' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiOperation({ summary: 'Soft-delete patient — ORG_ADMIN restricted to own org' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
