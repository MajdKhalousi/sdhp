import { Body, Controller, Get, Param, Post, Query, Version } from '@nestjs/common';
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
import { MedicalServiceRequestsService } from './medical-service-requests.service';
import { CreateMedicalServiceRequestDto } from './dto/create-medical-service-request.dto';
import { MedicalServiceRequestQueryDto } from './dto/medical-service-request-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Medical Service Requests')
@ApiBearerAuth()
@Controller('medical-service-requests')
export class MedicalServiceRequestsController {
  constructor(private readonly service: MedicalServiceRequestsService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.SECRETARY)
  @ApiOperation({ summary: 'Request a medical service for a patient. Snapshots service name/price at request time.' })
  @ApiCreatedResponse({ description: 'Medical service request created' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  create(@Body() dto: CreateMedicalServiceRequestDto, @CurrentUser() user: JwtPayload) {
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
    UserRole.ACCOUNTANT,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'List medical service requests for a patient' })
  @ApiOkResponse({ description: 'Paginated list of medical service requests' })
  findAll(@Query() query: MedicalServiceRequestQueryDto, @CurrentUser() user: JwtPayload) {
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
    UserRole.ACCOUNTANT,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'Get a single medical service request' })
  @ApiOkResponse({ description: 'Medical service request returned' })
  @ApiNotFoundResponse({ description: 'Medical service request not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }
}
