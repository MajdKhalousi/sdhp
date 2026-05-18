import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() phone: string;
  @ApiProperty() email: string | null;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() organizationId: string;
  @ApiProperty({ nullable: true }) branchId: string | null;
}

export class LoginResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() user: AuthUserDto;
}
