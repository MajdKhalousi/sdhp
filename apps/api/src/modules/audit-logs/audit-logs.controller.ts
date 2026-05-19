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
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List audit logs. Filterable by org, user, action, resource, date range.' })
  @ApiOkResponse({ description: 'Audit log list' })
  @ApiForbiddenResponse({ description: 'SUPER_ADMIN only' })
  findAll(@Query() query: AuditLogQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single audit log entry by ID' })
  @ApiOkResponse({ description: 'Audit log entry' })
  @ApiNotFoundResponse({ description: 'Audit log not found' })
  @ApiForbiddenResponse({ description: 'SUPER_ADMIN only' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }
}
