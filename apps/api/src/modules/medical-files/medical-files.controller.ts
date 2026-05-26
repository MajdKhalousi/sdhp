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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MedicalFilesService } from './medical-files.service';
import { CreateMedicalFileDto } from './dto/create-medical-file.dto';
import { UpdateMedicalFileDto } from './dto/update-medical-file.dto';
import { MedicalFileQueryDto } from './dto/medical-file-query.dto';
import { UploadUrlRequestDto } from './dto/upload-url-request.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Medical Files')
@ApiBearerAuth()
@Controller('medical-files')
export class MedicalFilesController {
  constructor(private readonly service: MedicalFilesService) {}

  @Post('upload-url')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({
    summary: 'Request a presigned PUT URL. Upload binary to the returned uploadUrl, then call POST /medical-files with the returned storageKey.',
  })
  @ApiCreatedResponse({ description: 'Presigned upload URL generated' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or patient not found' })
  getUploadUrl(@Body() dto: UploadUrlRequestDto, @CurrentUser() user: JwtPayload) {
    return this.service.getUploadUrl(dto, user);
  }

  @Post()
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'Register file metadata. uploadedById auto-resolved from JWT.' })
  @ApiCreatedResponse({ description: 'File metadata created' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  @ApiConflictResponse({ description: 'storageKey already exists' })
  create(@Body() dto: CreateMedicalFileDto, @CurrentUser() user: JwtPayload) {
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
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'List medical files. Filterable by patient, encounter, category, uploader, date range.' })
  @ApiOkResponse({ description: 'File list' })
  findAll(@Query() query: MedicalFileQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id/download-url')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'Get a short-lived presigned download URL for a medical file.' })
  @ApiOkResponse({ description: 'Presigned download URL returned' })
  @ApiNotFoundResponse({ description: 'File not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  getDownloadUrl(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.getDownloadUrl(id, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'Get a single medical file with nested patient and uploader' })
  @ApiOkResponse({ description: 'Medical file returned' })
  @ApiNotFoundResponse({ description: 'File not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update file metadata. Only fileName, description, category are mutable.' })
  @ApiOkResponse({ description: 'File metadata updated' })
  @ApiNotFoundResponse({ description: 'File not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalFileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Soft delete a medical file. DOCTOR can only delete their own uploads.' })
  @ApiOkResponse({ description: 'File soft-deleted' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or not own upload (DOCTOR)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}

@ApiTags('Medical Files')
@ApiBearerAuth()
@Controller('patients')
export class PatientMedicalFilesController {
  constructor(private readonly service: MedicalFilesService) {}

  @Get(':patientId/medical-files')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'List all medical files for a patient' })
  @ApiOkResponse({ description: 'Patient file list' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findByPatient(
    @Param('patientId') patientId: string,
    @Query() query: MedicalFileQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findByPatient(patientId, query, user);
  }
}
