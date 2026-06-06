import { Body, Controller, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FollowupsService } from './followups.service';
import { FollowUpQueryDto } from './dto/follow-up-query.dto';
import { FollowUpSummaryQueryDto } from './dto/follow-up-summary-query.dto';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { RecordResponseDto } from './dto/record-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Follow-ups')
@ApiBearerAuth()
@Controller('follow-ups')
export class FollowupsController {
  constructor(private readonly service: FollowupsService) {}

  @Get()
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
  )
  @ApiOperation({
    summary:
      'List follow-ups with computed status — DOCTOR: own patients only | Others: org-scoped with optional doctorId / branchId filters',
  })
  findAll(@Query() query: FollowUpQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get('summary')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
  )
  @ApiOperation({
    summary: 'Count follow-ups per status bucket — DOCTOR: own patients only | Others: org-scoped with optional filters',
  })
  getSummary(@Query() query: FollowUpSummaryQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.getSummary(query, user);
  }

  @Post(':encounterId/reminders')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.NURSE,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'Queue a follow-up reminder — PENDING record only, no actual sending' })
  createReminder(
    @Param('encounterId') encounterId: string,
    @Body() dto: CreateReminderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createReminder(encounterId, dto, user);
  }

  @Get(':encounterId/reminders')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.NURSE,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'List reminder history for a follow-up encounter, newest first' })
  findReminders(
    @Param('encounterId') encounterId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findReminders(encounterId, user);
  }

  @Patch(':encounterId/reminders/:reminderId')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.NURSE,
    UserRole.SECRETARY,
  )
  @ApiOperation({ summary: 'Update reminder status to SENT or FAILED' })
  updateReminder(
    @Param('encounterId') encounterId: string,
    @Param('reminderId') reminderId: string,
    @Body() dto: UpdateReminderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateReminder(encounterId, reminderId, dto, user);
  }

  @Patch(':encounterId/reminders/:reminderId/response')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.NURSE,
    UserRole.SECRETARY,
  )
  @ApiOperation({
    summary: 'Record patient response for a follow-up reminder — DOCTOR excluded. Allowed when status is PENDING or SENT.',
  })
  recordResponse(
    @Param('encounterId') encounterId: string,
    @Param('reminderId') reminderId: string,
    @Body() dto: RecordResponseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.recordResponse(encounterId, reminderId, dto, user);
  }
}
