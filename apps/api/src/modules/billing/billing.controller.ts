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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { BillingQueryDto } from './dto/billing-query.dto';
import { UpdateBillingPolicyDto } from './dto/update-billing-policy.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('invoices')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Post()
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Create a new invoice in DRAFT status. discountAmount must be 0 or omitted.' })
  @ApiCreatedResponse({ description: 'Invoice created' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  @ApiConflictResponse({ description: 'Invoice number conflict, please retry' })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List invoices. Filterable by org, branch, patient, status, date range.' })
  @ApiOkResponse({ description: 'Invoice list' })
  findAll(@Query() query: BillingQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get a single invoice with nested items and payments' })
  @ApiOkResponse({ description: 'Invoice returned' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update DRAFT invoice. Mutable: notes, discountAmount, dueDate, branchId.' })
  @ApiOkResponse({ description: 'Invoice updated' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/items')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Add item to DRAFT invoice. Updates subtotal and totalAmount atomically.' })
  @ApiCreatedResponse({ description: 'Item added, invoice totals updated' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  addItem(
    @Param('id') id: string,
    @Body() dto: AddInvoiceItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.addItem(id, dto, user);
  }

  @Delete(':id/items/:itemId')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Remove item from DRAFT invoice. Updates subtotal and totalAmount atomically.' })
  @ApiNoContentResponse({ description: 'Item removed, invoice totals updated' })
  @ApiNotFoundResponse({ description: 'Invoice or item not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeItem(id, itemId, user);
  }

  @Patch(':id/issue')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Issue a DRAFT invoice. Requires at least one item. Sets issuedAt.' })
  @ApiOkResponse({ description: 'Invoice issued' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  issue(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.issue(id, user);
  }

  @Patch(':id/cancel')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Cancel a DRAFT or ISSUED (no payments) invoice. Sets cancelledAt.' })
  @ApiOkResponse({ description: 'Invoice cancelled' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cancel(id, dto, user);
  }

  @Post(':id/payments')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Record a payment on ISSUED or PARTIALLY_PAID invoice. Atomic paidAmount update.' })
  @ApiCreatedResponse({ description: 'Payment recorded, invoice status updated' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.recordPayment(id, dto, user);
  }

  @Post(':id/payments/:paymentId/void')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Void a payment. Subtracts amount from paidAmount, recalculates invoice status. voidReason required.' })
  @ApiOkResponse({ description: 'Payment voided, invoice status recalculated' })
  @ApiNotFoundResponse({ description: 'Invoice or payment not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  voidPayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: VoidPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.voidPayment(id, paymentId, dto, user);
  }
}

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingPolicyController {
  constructor(private readonly service: BillingService) {}

  @Get('policy')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Get org billing policy. Auto-creates with defaults on first access.' })
  @ApiOkResponse({ description: 'Billing policy returned' })
  getPolicy(@CurrentUser() user: JwtPayload) {
    return this.service.getBillingPolicy(user);
  }

  @Patch('policy')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Update org billing policy. All fields are optional.' })
  @ApiOkResponse({ description: 'Billing policy updated' })
  upsertPolicy(@Body() dto: UpdateBillingPolicyDto, @CurrentUser() user: JwtPayload) {
    return this.service.upsertBillingPolicy(dto, user);
  }
}

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('patients')
export class PatientInvoicesController {
  constructor(private readonly service: BillingService) {}

  @Get(':patientId/invoices')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List all invoices for a patient' })
  @ApiOkResponse({ description: 'Patient invoice list' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  findByPatient(
    @Param('patientId') patientId: string,
    @Query() query: BillingQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findByPatient(patientId, query, user);
  }
}
