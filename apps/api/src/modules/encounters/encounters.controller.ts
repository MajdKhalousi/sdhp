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
import { EncountersService } from './encounters.service';
import { EncounterQueryDto } from './dto/encounter-query.dto';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { UpdateEncounterDto } from './dto/update-encounter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresActiveSubscription } from '../../common/decorators/requires-active-subscription.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Encounters')
@ApiBearerAuth()
@Controller('encounters')
export class EncountersController {
  constructor(private readonly service: EncountersService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.SECRETARY)
  @ApiOperation({
    summary:
      'List encounters — SUPER_ADMIN: all | ORG_ADMIN/NURSE/SECRETARY: own org | DOCTOR: own encounters in org',
  })
  findAll(@Query() query: EncounterQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.SECRETARY)
  @ApiOperation({ summary: 'Get encounter by ID — ORG_ADMIN/DOCTOR/NURSE/SECRETARY restricted to own org' })
  @ApiNotFoundResponse({ description: 'Encounter not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @RequiresActiveSubscription()
  @ApiOperation({
    summary:
      'Create encounter — DOCTOR callers must use their own doctorId. Links to appointment trigger status updates (appointment→IN_PROGRESS, queue→IN_PROGRESS). Repeat calls for an appointment with an existing encounter return that encounter only if the resolved doctorId matches; otherwise rejected with 409.',
  })
  @ApiNotFoundResponse({ description: 'Patient, Doctor, or Appointment not found' })
  @ApiConflictResponse({
    description:
      'Encounter already exists for this appointment under a race condition, OR an encounter already exists for this appointment under a different doctor',
  })
  create(@Body() dto: CreateEncounterDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @RequiresActiveSubscription()
  @ApiOperation({
    summary:
      'Update encounter — DOCTOR can only update their own encounters. organizationId/patientId/doctorId/appointmentId cannot be changed.',
  })
  @ApiNotFoundResponse({ description: 'Encounter not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEncounterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Encounter soft-deleted' })
  @ApiNotFoundResponse({ description: 'Encounter not found' })
  @ApiOperation({ summary: 'Soft-delete encounter — ORG_ADMIN restricted to own org, DOCTOR cannot delete' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
