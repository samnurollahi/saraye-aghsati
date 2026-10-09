import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectLoanRequestDto {
  @ApiPropertyOptional({ example: 'مدارک تکمیلی لازم است.' })
  @IsOptional()
  @IsString({ message: 'یادداشت ادمین باید متن باشد.' })
  adminNote?: string;
}
