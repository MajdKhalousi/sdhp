import { PartialType, PickType } from '@nestjs/swagger';
import { CreateMedicalFileDto } from './create-medical-file.dto';

export class UpdateMedicalFileDto extends PartialType(
  PickType(CreateMedicalFileDto, ['fileName', 'description', 'category'] as const),
) {}
