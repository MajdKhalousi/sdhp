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
import { EmployeesService } from './employees.service';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { EmployeeDetailQueryDto } from './dto/employee-detail-query.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

// No @RequiresActiveSubscription() on any route here — HR/payroll record-keeping
// is an administrative function, not a new clinical/financial obligation, and is
// deliberately exempt from the subscription write guard (see Phase 144A/144B).
@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary:
      'List employee profiles — SUPER_ADMIN: all (optionally filtered by organizationId) | ORG_ADMIN/ACCOUNTANT: own org only',
  })
  findAll(@Query() query: EmployeeQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary:
      'Get employee profile by ID — ORG_ADMIN/ACCOUNTANT restricted to own org. ' +
      'includeDeleted=true allows read-only access to a soft-deleted profile (e.g. an archived detail view); has no effect on writes.',
  })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  findOne(
    @Param('id') id: string,
    @Query() query: EmployeeDetailQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user, { includeDeleted: query.includeDeleted });
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({
    summary:
      'Create employee profile — accountMode: NONE (default, no login), LINK_EXISTING (provide userId), ' +
      'or CREATE_NEW (provide account; creates the User and EmployeeProfile atomically). ' +
      'Omitting accountMode infers it from userId for backward compatibility. SUPER_ADMIN must supply organizationId.',
  })
  @ApiConflictResponse({ description: 'Linked user already linked to another employee profile, or duplicate phone/email on account creation' })
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({
    summary:
      'Update employee profile — organizationId cannot be changed. Send userId: null to unlink from a User account.',
  })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  @ApiConflictResponse({ description: 'Linked user is already linked to another employee profile' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/restore')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({
    summary:
      'Restore a soft-deleted employee profile — ORG_ADMIN restricted to own org. ' +
      'Only clears deletedAt; employmentStatus is left exactly as it was. Does not affect the linked User account.',
  })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  restore(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.restore(id, user);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Employee profile soft-deleted' })
  @ApiNotFoundResponse({ description: 'Employee profile not found' })
  @ApiOperation({ summary: 'Soft-delete employee profile — ORG_ADMIN restricted to own org. Does not affect the linked User account.' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
