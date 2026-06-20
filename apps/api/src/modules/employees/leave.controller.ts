import { Body, Controller, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { LeaveDecisionDto } from './dto/leave-decision.dto';
import { LeaveRequestQueryDto } from './dto/leave-request-query.dto';
import { LeaveQueueQueryDto } from './dto/leave-queue-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

// No @RequiresActiveSubscription() — HR record-keeping is administrative,
// exempt from the subscription write guard like the rest of the
// EmployeeProfile module (see Phase 144A/144B/144C). ACCOUNTANT and clinical
// roles deliberately have zero access this phase — same strictness as
// EmployeeDocumentsController/AttendanceController (Phase 147B).
@ApiTags('Leave Requests')
@ApiBearerAuth()
@Controller('employees/:employeeProfileId/leave-requests')
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Create a leave request for one employee.' })
  @ApiCreatedResponse({ description: 'Leave request created' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  @ApiBadRequestResponse({ description: 'endDate is before startDate' })
  @ApiConflictResponse({ description: 'Overlapping pending/approved leave request already exists' })
  create(
    @Param('employeeProfileId') employeeProfileId: string,
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(employeeProfileId, dto, user);
  }

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: "List one employee's leave request history. Optional status filter." })
  @ApiOkResponse({ description: 'Leave request list' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  findAll(
    @Param('employeeProfileId') employeeProfileId: string,
    @Query() query: LeaveRequestQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAllForEmployee(employeeProfileId, query, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Update type/startDate/endDate/reason on a pending leave request.' })
  @ApiOkResponse({ description: 'Leave request updated' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile or leave request not found' })
  @ApiBadRequestResponse({ description: 'Not pending, or endDate is before startDate' })
  @ApiConflictResponse({ description: 'Overlapping pending/approved leave request already exists' })
  update(
    @Param('employeeProfileId') employeeProfileId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(employeeProfileId, id, dto, user);
  }

  @Patch(':id/approve')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Approve a pending leave request.' })
  @ApiOkResponse({ description: 'Leave request approved' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile or leave request not found' })
  @ApiBadRequestResponse({ description: 'Leave request is not pending' })
  approve(
    @Param('employeeProfileId') employeeProfileId: string,
    @Param('id') id: string,
    @Body() dto: LeaveDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.approve(employeeProfileId, id, dto, user);
  }

  @Patch(':id/reject')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Reject a pending leave request.' })
  @ApiOkResponse({ description: 'Leave request rejected' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile or leave request not found' })
  @ApiBadRequestResponse({ description: 'Leave request is not pending' })
  reject(
    @Param('employeeProfileId') employeeProfileId: string,
    @Param('id') id: string,
    @Body() dto: LeaveDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reject(employeeProfileId, id, dto, user);
  }

  @Patch(':id/cancel')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Cancel a pending or approved leave request.' })
  @ApiOkResponse({ description: 'Leave request cancelled' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  @ApiNotFoundResponse({ description: 'Employee profile or leave request not found' })
  @ApiBadRequestResponse({ description: 'Leave request is not pending or approved' })
  cancel(
    @Param('employeeProfileId') employeeProfileId: string,
    @Param('id') id: string,
    @Body() dto: LeaveDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cancel(employeeProfileId, id, dto, user);
  }
}

// Org-wide leave queue — deliberately a separate top-level controller (not
// nested under a single employeeProfileId), since it lists every employee's
// leave requests at once, e.g. all PENDING approvals. Lives in the same
// file/module as LeaveController, mirroring attendance.controller.ts's
// AttendanceController/DailyAttendanceController split (Phase 147B).
@ApiTags('Leave Requests')
@ApiBearerAuth()
@Controller('leave-requests')
export class LeaveQueueController {
  constructor(private readonly service: LeaveService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: "List the caller's organization's leave requests, optionally filtered by status." })
  @ApiOkResponse({ description: 'Paginated leave request list, org-scoped' })
  findAll(@Query() query: LeaveQueueQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAllForOrg(query, user);
  }
}
