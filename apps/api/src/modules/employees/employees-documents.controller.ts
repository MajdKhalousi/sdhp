import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { EmployeesDocumentsService } from './employees-documents.service';
import { UploadEmployeeDocumentUrlDto } from './dto/upload-employee-document-url.dto';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

// No @RequiresActiveSubscription() on any route here — HR documents are
// administrative record-keeping, exempt from the subscription write guard
// like the rest of the EmployeeProfile module (see Phase 144A/144B/144C).
// ACCOUNTANT deliberately has zero access — these documents may include ID
// scans and contracts, not just salary data ACCOUNTANT legitimately needs.
@ApiTags('Employee Documents')
@ApiBearerAuth()
@Controller('employees/:employeeProfileId/documents')
export class EmployeeDocumentsController {
  constructor(private readonly service: EmployeesDocumentsService) {}

  @Post('upload-url')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({
    summary:
      'Request a presigned PUT URL. Upload binary to the returned uploadUrl, then call POST documents with the returned storageKey.',
  })
  @ApiCreatedResponse({ description: 'Presigned upload URL generated' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  getUploadUrl(
    @Param('employeeProfileId') employeeProfileId: string,
    @Body() dto: UploadEmployeeDocumentUrlDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getUploadUrl(employeeProfileId, dto, user);
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Register document metadata. uploadedById auto-resolved from JWT.' })
  @ApiCreatedResponse({ description: 'Document metadata created' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  @ApiConflictResponse({ description: 'storageKey already exists' })
  create(
    @Param('employeeProfileId') employeeProfileId: string,
    @Body() dto: CreateEmployeeDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(employeeProfileId, dto, user);
  }

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'List non-deleted documents for an employee profile.' })
  @ApiOkResponse({ description: 'Document list' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  findAll(@Param('employeeProfileId') employeeProfileId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(employeeProfileId, user);
  }

  @Get(':documentId/download-url')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Get a short-lived presigned download URL for an employee document.' })
  @ApiOkResponse({ description: 'Presigned download URL returned' })
  @ApiNotFoundResponse({ description: 'Employee profile or document not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  getDownloadUrl(
    @Param('employeeProfileId') employeeProfileId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getDownloadUrl(employeeProfileId, documentId, user);
  }

  @Delete(':documentId')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Document soft-deleted' })
  @ApiNotFoundResponse({ description: 'Employee profile or document not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiOperation({ summary: 'Soft-delete an employee document. The underlying storage object is retained.' })
  remove(
    @Param('employeeProfileId') employeeProfileId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(employeeProfileId, documentId, user);
  }
}
