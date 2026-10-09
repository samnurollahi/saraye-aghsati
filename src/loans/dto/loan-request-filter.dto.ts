import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { LoanRequestStatus } from '../loan.enums';

export class LoanRequestFilterDto {
  @ApiPropertyOptional({ enum: LoanRequestStatus })
  @IsOptional()
  @IsEnum(LoanRequestStatus, { message: 'وضعیت درخواست معتبر نیست.' })
  status?: LoanRequestStatus;
}
