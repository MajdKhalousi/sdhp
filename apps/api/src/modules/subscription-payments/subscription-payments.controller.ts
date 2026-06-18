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
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SubscriptionPaymentsService } from './subscription-payments.service';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Subscription Payments')
@ApiBearerAuth()
@Controller('organizations/:organizationId/subscription-payments')
export class SubscriptionPaymentsController {
  constructor(private readonly service: SubscriptionPaymentsService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List subscription payment history for an organization — SUPER_ADMIN only' })
  findAll(@Param('organizationId') organizationId: string) {
    return this.service.findAll(organizationId);
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record a subscription payment for an organization — SUPER_ADMIN only' })
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateSubscriptionPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(organizationId, dto, user);
  }

  @Patch(':paymentId')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a subscription payment — SUPER_ADMIN only' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdateSubscriptionPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(organizationId, paymentId, dto, user);
  }

  @Delete(':paymentId')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Subscription payment soft-deleted' })
  @ApiOperation({ summary: 'Soft-delete a subscription payment — SUPER_ADMIN only' })
  remove(
    @Param('organizationId') organizationId: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(organizationId, paymentId, user);
  }
}
