import { PartialType, PickType } from '@nestjs/swagger';
import { CreateClinicalReportDto } from './create-clinical-report.dto';

export class UpdateClinicalReportDto extends PartialType(
  PickType(CreateClinicalReportDto, ['title', 'content', 'status'] as const),
) {}
