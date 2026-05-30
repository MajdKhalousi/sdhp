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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { VisitTypesService } from './visit-types.service';
import { CreateVisitTypeDto } from './dto/create-visit-type.dto';
import { UpdateVisitTypeDto } from './dto/update-visit-type.dto';
import { VisitTypeQueryDto } from './dto/visit-type-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Visit Types')
@ApiBearerAuth()
@Controller('visit-types')
export class VisitTypesController {
  constructor(private readonly service: VisitTypesService) {}

  @Get()
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
  @ApiOperation({ summary: 'List visit types for the organization' })
  @ApiOkResponse({ description: 'Visit type list returned' })
  findAll(@Query() query: VisitTypeQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(user, query.includeInactive);
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Create a visit type' })
  @ApiCreatedResponse({ description: 'Visit type created' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  create(@Body() dto: CreateVisitTypeDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Update a visit type' })
  @ApiOkResponse({ description: 'Visit type updated' })
  @ApiNotFoundResponse({ description: 'Visit type not found' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVisitTypeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a visit type' })
  @ApiNoContentResponse({ description: 'Visit type deleted' })
  @ApiNotFoundResponse({ description: 'Visit type not found' })
  @ApiForbiddenResponse({ description: 'ORG_ADMIN or SUPER_ADMIN required' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
