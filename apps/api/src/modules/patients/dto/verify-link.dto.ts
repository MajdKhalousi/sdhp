import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyLinkDto {
  @ApiProperty({ description: 'clinicPatientId returned by the link-request endpoint' })
  @IsString()
  clinicPatientId: string;

  @ApiProperty({ example: '482931', description: '6-digit verification code' })
  @IsString()
  @Length(6, 6)
  code: string;
}
