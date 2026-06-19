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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresActiveSubscription } from '../../common/decorators/requires-active-subscription.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({
    summary:
      'List appointments — SUPER_ADMIN: all | ORG_ADMIN/SECRETARY/NURSE: own org | DOCTOR: own appointments in org',
  })
  findAll(@Query() query: AppointmentQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Get appointment by ID — ORG_ADMIN/SECRETARY/DOCTOR/NURSE restricted to own org' })
  @ApiNotFoundResponse({ description: 'Appointment not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY)
  @RequiresActiveSubscription()
  @ApiOperation({
    summary:
      'Create appointment — patientId and doctorId must belong to the same org. SUPER_ADMIN must supply organizationId.',
  })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY)
  @ApiOperation({
    summary:
      'Update appointment — organizationId/patientId/doctorId cannot be changed. Setting status to CANCELLED auto-sets cancelledAt. ' +
      'Subscription-blocked orgs may still cancel/confirm/mark no-show (status-only); rescheduling or other field changes are blocked (see AppointmentsService.update).',
  })
  @ApiNotFoundResponse({ description: 'Appointment not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Appointment soft-deleted' })
  @ApiNotFoundResponse({ description: 'Appointment not found' })
  @ApiOperation({ summary: 'Soft-delete appointment — ORG_ADMIN restricted to own org' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
