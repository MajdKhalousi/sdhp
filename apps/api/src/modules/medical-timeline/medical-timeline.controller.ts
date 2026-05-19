import { Controller, Get, Param, Version } from '@nestjs/common';
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary:
      'Get chronological medical timeline for a patient — aggregates appointments, queue check-ins, encounters, and prescriptions sorted newest first.',
  })
  @ApiOkResponse({ description: 'Sorted array of normalized timeline events' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Access to this patient timeline is not allowed' })
  getTimeline(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload) {
    return this.service.getPatientTimeline(patientId, user);
  }
}
