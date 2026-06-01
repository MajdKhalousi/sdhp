import { Controller, Get, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FollowupsService } from './followups.service';
import { FollowUpQueryDto } from './dto/follow-up-query.dto';
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
}
