import { PartialType, PickType } from '@nestjs/swagger';
import { CreateInvoiceDto } from './create-invoice.dto';

export class UpdateInvoiceDto extends PartialType(
  PickType(CreateInvoiceDto, ['notes', 'discountAmount', 'dueDate', 'branchId'] as const),
) {}
