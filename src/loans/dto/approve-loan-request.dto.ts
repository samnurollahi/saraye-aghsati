import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class ApproveLoanRequestDto {
  @ApiProperty({ type: Number, example: 100000000, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'مبلغ وام باید عدد معتبر با حداکثر دو رقم اعشار باشد.' },
  )
  @Min(0.01, { message: 'مبلغ وام معتبر نیست.' })
  principalAmount!: number;

  @ApiProperty({ type: Number, example: 18, minimum: 0 })
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'درصد سود باید عدد معتبر باشد.' },
  )
  @Min(0, { message: 'درصد سود نمی‌تواند منفی باشد.' })
  interestRate!: number;

  @ApiProperty({ type: Number, example: 12, minimum: 1 })
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    { message: 'تعداد اقساط باید عدد صحیح باشد.' },
  )
  @Min(1, { message: 'تعداد اقساط معتبر نیست.' })
  installmentCount!: number;

  @ApiProperty({ type: String, format: 'date', example: '2026-10-10' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'تاریخ شروع باید با قالب YYYY-MM-DD وارد شود.',
  })
  @IsDateString(
    { strict: true, strictSeparator: true },
    { message: 'تاریخ شروع معتبر نیست.' },
  )
  startDate!: string;

  @ApiPropertyOptional({ example: 'شرایط بازپرداخت تایید شد.' })
  @IsOptional()
  @IsString({ message: 'یادداشت ادمین باید متن باشد.' })
  adminNote?: string;
}
