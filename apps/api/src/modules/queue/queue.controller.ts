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
import { QueueService } from './queue.service';
import { QueueQueryDto } from './dto/queue-query.dto';
import { CreateQueueEntryDto } from './dto/create-queue-entry.dto';
import { UpdateQueueEntryDto } from './dto/update-queue-entry.dto';
import { TriageQueueEntryDto } from './dto/triage-queue-entry.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresActiveSubscription } from '../../common/decorators/requires-active-subscription.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Queue')
@ApiBearerAuth()
@Controller('queue')
export class QueueController {
  constructor(private readonly service: QueueService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({
    summary:
      'List queue entries — SUPER_ADMIN: all | ORG_ADMIN/SECRETARY/NURSE: own org | DOCTOR: own entries in org',
  })
  findAll(@Query() query: QueueQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Get queue entry by ID — ORG_ADMIN/SECRETARY/DOCTOR/NURSE restricted to own org' })
  @ApiNotFoundResponse({ description: 'Queue entry not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY)
  @RequiresActiveSubscription()
  @ApiOperation({
    summary:
      'Check patient in — creates queue entry from an existing appointment. Ticket number auto-generated. Appointment status updated to IN_QUEUE.',
  })
  @ApiNotFoundResponse({ description: 'Appointment not found' })
  @ApiConflictResponse({ description: 'Queue entry already exists for this appointment' })
  create(@Body() dto: CreateQueueEntryDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id/triage')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.NURSE)
  @ApiOperation({
    summary:
      'Record nurse pre-encounter triage data (vitals + chief complaint draft) on a queue entry. Does NOT change queue status or trigger invoice.',
  })
  @ApiNotFoundResponse({ description: 'Queue entry not found' })
  triage(
    @Param('id') id: string,
    @Body() dto: TriageQueueEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.triage(id, dto, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({
    summary:
      'Update queue entry status — CALLED auto-sets calledAt; DONE auto-sets completedAt. DOCTOR restricted to own appointment entries. NURSE: full org access.',
  })
  @ApiNotFoundResponse({ description: 'Queue entry not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQueueEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Queue entry soft-deleted (deletedAt set)' })
  @ApiNotFoundResponse({ description: 'Queue entry not found' })
  @ApiOperation({ summary: 'Soft-delete queue entry (sets deletedAt)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
