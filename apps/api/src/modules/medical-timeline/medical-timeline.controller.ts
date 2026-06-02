import { Controller, Get, Param, Query, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MedicalTimelineService } from './medical-timeline.service';
import { PatientTimelineQueryDto } from './dto/patient-timeline-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Medical Timeline')
@ApiBearerAuth()
@Controller('patients')
export class MedicalTimelineController {
  constructor(private readonly service: MedicalTimelineService) {}

  @Get(':patientId/timeline')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({
    summary:
      'Patient clinical timeline — paginated chronological feed of encounters, prescriptions, lab orders, radiology orders, and medical files. Filter by type, date range, and page.',
  })
  @ApiOkResponse({ description: 'Paginated timeline with patient summary and typed events' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Access to this patient is not allowed' })
  getTimeline(
    @Param('patientId') patientId: string,
    @Query() query: PatientTimelineQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getPatientTimeline(patientId, query, user);
  }
}
