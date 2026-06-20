import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

// Filters for one employee's leave history (GET .../employees/:id/leave-requests).
export class LeaveRequestQueryDto {
  @ApiPropertyOptional({ enum: LeaveStatus })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;
}
