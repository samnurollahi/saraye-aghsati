import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';

export class ConfirmInstallmentPaymentDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-10-08T12:30:00.000Z',
  })
  @IsOptional()
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
    { message: 'زمان پرداخت باید همراه منطقه زمانی و با قالب ISO ارسال شود.' },
  )
  @IsDateString({}, { message: 'زمان پرداخت معتبر نیست.' })
  paidAt?: string;
}
