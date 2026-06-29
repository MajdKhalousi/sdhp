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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import { CreatePrescriptionTemplateDto } from './dto/create-prescription-template.dto';
import { UpdatePrescriptionTemplateDto } from './dto/update-prescription-template.dto';
import { PrescriptionTemplateQueryDto } from './dto/prescription-template-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Prescription Templates')
@ApiBearerAuth()
@Controller('prescription-templates')
export class PrescriptionTemplatesController {
  constructor(private readonly service: PrescriptionTemplatesService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'List prescription templates for the organization' })
  @ApiOkResponse({ description: 'Prescription template list returned' })
  findAll(@Query() query: PrescriptionTemplateQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(user, query.includeInactive);
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Get a prescription template by ID' })
  @ApiOkResponse({ description: 'Prescription template returned' })
  @ApiNotFoundResponse({ description: 'Prescription template not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Create a prescription template' })
  @ApiCreatedResponse({ description: 'Prescription template created' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  create(@Body() dto: CreatePrescriptionTemplateDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Update a prescription template; replaces items atomically if provided' })
  @ApiOkResponse({ description: 'Prescription template updated' })
  @ApiNotFoundResponse({ description: 'Prescription template not found' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a prescription template' })
  @ApiNoContentResponse({ description: 'Prescription template deleted' })
  @ApiNotFoundResponse({ description: 'Prescription template not found' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
