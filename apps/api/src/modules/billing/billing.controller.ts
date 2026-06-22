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
  Res,
  StreamableFile,
  Version,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBadRequestResponse,
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
import { PdfService, type InvoicePdfData } from '../pdf/pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { BillingQueryDto } from './dto/billing-query.dto';
import { UpdateBillingPolicyDto } from './dto/update-billing-policy.dto';
import { OutstandingPatientsQueryDto } from './dto/outstanding-patients-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresActiveSubscription } from '../../common/decorators/requires-active-subscription.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('invoices')
export class BillingController {
  constructor(
    private readonly service: BillingService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
  )
  @RequiresActiveSubscription()
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

  @Get(':id/pdf')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Download invoice as PDF. Same access as GET :id.' })
  @ApiOkResponse({ description: 'PDF file stream' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  async getInvoicePdf(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const result = await this.service.getInvoiceForPdf(id, user);
    const data: InvoicePdfData = {
      invoiceNumber: result.invoiceNumber,
      status: result.status,
      issuedAt: result.issuedAt,
      createdAt: result.createdAt,
      dueDate: result.dueDate,
      subtotal: result.subtotal.toNumber(),
      discountAmount: result.discountAmount.toNumber(),
      totalAmount: result.totalAmount.toNumber(),
      paidAmount: result.paidAmount.toNumber(),
      notes: result.notes ?? null,
      cancelReason: result.cancelReason ?? null,
      patient: {
        firstName: result.patient.firstName,
        lastName: result.patient.lastName,
        mrn: result.patient.mrn,
      },
      createdByName: `${result.createdBy.firstName} ${result.createdBy.lastName}`,
      items: result.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        discount: item.discount.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
      })),
      payments: result.payments.map((p) => ({
        amount: p.amount.toNumber(),
        method: p.method,
        paidAt: p.paidAt,
        referenceNumber: p.referenceNumber ?? null,
        receivedByName: `${p.receivedBy.firstName} ${p.receivedBy.lastName}`,
        voidedAt: p.voidedAt ?? null,
        voidReason: p.voidReason ?? null,
      })),
      orgName: result.orgName,
      orgNameAr: result.orgNameAr,
    };
    const buffer = await this.pdfService.generateInvoicePdf(data);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${result.invoiceNumber}.pdf"`,
    });
    return new StreamableFile(buffer);
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
  @RequiresActiveSubscription()
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

  @Patch(':id/settle-no-charge')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY, UserRole.ACCOUNTANT)
  @RequiresActiveSubscription()
  @ApiOperation({
    summary:
      'Settle a zero-total ISSUED invoice as no-charge — sets status to PAID without recording a payment. paidAmount remains 0.',
  })
  @ApiOkResponse({ description: 'Invoice settled as no-charge (PAID, paidAmount unchanged at 0)' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied or insufficient role' })
  @ApiBadRequestResponse({
    description: 'Invoice is not ISSUED, or invoice totalAmount is not zero',
  })
  settleNoCharge(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.settleNoCharge(id, user);
  }

  @Post(':id/payments')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY, UserRole.ACCOUNTANT)
  @RequiresActiveSubscription()
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

  @Get('outstanding-patients')
  @Version('1')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary:
      'Paginated list of patients with outstanding balances (ISSUED + PARTIALLY_PAID invoices), sorted by outstanding amount descending.',
  })
  @ApiOkResponse({ description: 'Outstanding patients list' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  getOutstandingPatients(
    @Query() query: OutstandingPatientsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getOutstandingPatients(query, user);
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

  @Get(':patientId/outstanding-balance')
  @Version('1')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({
    summary:
      'Outstanding balance for a patient — sum of (totalAmount - paidAmount) across all ISSUED and PARTIALLY_PAID invoices.',
  })
  @ApiOkResponse({ description: 'Patient outstanding balance' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  @ApiForbiddenResponse({ description: 'Cross-org access denied' })
  getPatientOutstandingBalance(
    @Param('patientId') patientId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getPatientOutstandingBalance(patientId, user);
  }
}
