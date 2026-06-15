import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password — required to verify identity' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New password — minimum 10 characters, must contain letters and numbers',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'New password must be at least 10 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'New password must contain at least one letter and one number',
  })
  newPassword: string;

  @ApiProperty({ description: 'Must match newPassword exactly' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
