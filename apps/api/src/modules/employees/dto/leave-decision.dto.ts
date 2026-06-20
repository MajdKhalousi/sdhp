import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Shared body shape for approve/reject/cancel — status itself is set by the
// route, never accepted from the client (mirrors RecordResponseDto's pattern
// in the followups module).
export class LeaveDecisionDto {
  @ApiPropertyOptional({ example: 'Approved per team coverage plan' })
  @IsOptional()
  @IsString()
  decisionNote?: string;
}
