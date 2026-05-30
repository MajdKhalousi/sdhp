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
  Put,
  Query,
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
import { DoctorSchedulesService } from './doctor-schedules.service';
import { UpsertDoctorScheduleDto } from './dto/upsert-doctor-schedule.dto';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { UpdateScheduleExceptionDto } from './dto/update-schedule-exception.dto';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Doctor Schedules')
@ApiBearerAuth()
@Controller('doctors/:doctorId')
export class DoctorSchedulesController {
  constructor(private readonly service: DoctorSchedulesService) {}

  // ── Weekly schedule ────────────────────────────────────────────────────────

  @Get('schedule')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: "Get doctor's weekly schedule" })
  @ApiOkResponse({ description: 'Weekly schedule returned' })
  @ApiNotFoundResponse({ description: 'Doctor not found' })
  getSchedule(@Param('doctorId') doctorId: string, @CurrentUser() user: JwtPayload) {
    return this.service.getSchedule(doctorId, user);
  }

  @Put('schedule')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: "Atomically replace doctor's entire weekly schedule. Pass days:[] to clear." })
  @ApiOkResponse({ description: 'Schedule replaced' })
  @ApiNotFoundResponse({ description: 'Doctor not found' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  upsertSchedule(
    @Param('doctorId') doctorId: string,
    @Body() dto: UpsertDoctorScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsertSchedule(doctorId, dto, user);
  }

  // ── Available slots ────────────────────────────────────────────────────────

  @Get('available-slots')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'Get available appointment slots for a doctor on a given date' })
  @ApiOkResponse({ description: 'Available slots returned' })
  @ApiNotFoundResponse({ description: 'Doctor not found' })
  getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query() query: AvailableSlotsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getAvailableSlots(doctorId, query, user);
  }

  // ── Schedule exceptions ────────────────────────────────────────────────────

  @Get('schedule/exceptions')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
    UserRole.TECHNICIAN,
  )
  @ApiOperation({ summary: 'List all schedule exceptions for a doctor' })
  @ApiOkResponse({ description: 'Exception list returned' })
  listExceptions(@Param('doctorId') doctorId: string, @CurrentUser() user: JwtPayload) {
    return this.service.listExceptions(doctorId, user);
  }

  @Post('schedule/exceptions')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Create a schedule exception (holiday, leave, or custom hours)' })
  @ApiCreatedResponse({ description: 'Exception created' })
  @ApiConflictResponse({ description: 'An exception already exists for this date' })
  @ApiNotFoundResponse({ description: 'Doctor not found' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  createException(
    @Param('doctorId') doctorId: string,
    @Body() dto: CreateScheduleExceptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createException(doctorId, dto, user);
  }

  @Patch('schedule/exceptions/:exceptionId')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Update a schedule exception' })
  @ApiOkResponse({ description: 'Exception updated' })
  @ApiNotFoundResponse({ description: 'Exception not found' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  updateException(
    @Param('doctorId') doctorId: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: UpdateScheduleExceptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateException(doctorId, exceptionId, dto, user);
  }

  @Delete('schedule/exceptions/:exceptionId')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Delete a schedule exception' })
  @ApiNoContentResponse({ description: 'Exception deleted' })
  @ApiNotFoundResponse({ description: 'Exception not found' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  deleteException(
    @Param('doctorId') doctorId: string,
    @Param('exceptionId') exceptionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deleteException(doctorId, exceptionId, user);
  }
}
