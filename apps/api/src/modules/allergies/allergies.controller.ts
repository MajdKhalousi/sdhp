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
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AllergiesService } from './allergies.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Allergies')
@ApiBearerAuth()
@Controller('patients/:patientId/allergies')
export class AllergiesController {
  constructor(private readonly service: AllergiesService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'List all allergies for a patient' })
  @ApiOkResponse({ description: 'Allergy list returned' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findAll(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(patientId, user);
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Add an allergy to a patient' })
  @ApiCreatedResponse({ description: 'Allergy created' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  create(
    @Param('patientId') patientId: string,
    @Body() dto: CreateAllergyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(patientId, dto, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Update an allergy' })
  @ApiOkResponse({ description: 'Allergy updated' })
  @ApiNotFoundResponse({ description: 'Patient or allergy not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  update(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAllergyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(patientId, id, dto, user);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Delete an allergy (hard delete — no recovery)' })
  @ApiNoContentResponse({ description: 'Allergy deleted' })
  @ApiNotFoundResponse({ description: 'Patient or allergy not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  remove(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(patientId, id, user);
  }
}
