import { Body, Controller, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
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
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { DailyAttendanceQueryDto } from './dto/daily-attendance-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

// No @RequiresActiveSubscription() — HR record-keeping is administrative,
// exempt from the subscription write guard like the rest of the
// EmployeeProfile module (see Phase 144A/144B/144C). ACCOUNTANT and clinical
// roles deliberately have zero access this phase — same strictness as
// EmployeeDocumentsController, including on GET (Phase 147A).
@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('employees/:employeeProfileId/attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Create a manual attendance record for one employee on one date.' })
  @ApiCreatedResponse({ description: 'Attendance record created' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  @ApiConflictResponse({ description: 'A record already exists for this employee on this date' })
  create(
    @Param('employeeProfileId') employeeProfileId: string,
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(employeeProfileId, dto, user);
  }

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: "List one employee's attendance history. Optional from/to/status filters." })
  @ApiOkResponse({ description: 'Attendance record list' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  findAll(
    @Param('employeeProfileId') employeeProfileId: string,
    @Query() query: AttendanceQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAllForEmployee(employeeProfileId, query, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Update status/checkInAt/checkOutAt/notes/date on an existing attendance record.' })
  @ApiOkResponse({ description: 'Attendance record updated' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile or attendance record not found' })
  @ApiConflictResponse({ description: 'Another record already exists for this employee on the new date' })
  update(
    @Param('employeeProfileId') employeeProfileId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(employeeProfileId, id, dto, user);
  }
}

// Org-wide daily roster view — deliberately a separate top-level controller
// (not nested under a single employeeProfileId) since it lists every
// employee's attendance for one date at once. Lives in the same file/module
// as AttendanceController since it's a thin read path over the same service.
@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class DailyAttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: "List the caller's organization's attendance records for one calendar date." })
  @ApiOkResponse({ description: 'Attendance records for the given date, org-scoped' })
  findAllForDate(@Query() query: DailyAttendanceQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAllForOrgOnDate(query, user);
  }
}
