import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { InstallmentStatus } from '../loan.enums';

export class AdminInstallmentFilterDto {
  @ApiPropertyOptional({
    enum: [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE],
  })
  @IsOptional()
  @IsEnum(
    {
      PENDING: InstallmentStatus.PENDING,
      OVERDUE: InstallmentStatus.OVERDUE,
    },
    { message: 'وضعیت قسط معتبر نیست.' },
  )
  status?: InstallmentStatus.PENDING | InstallmentStatus.OVERDUE;

  @ApiPropertyOptional({ type: String, format: 'date', example: '2026-10-08' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'تاریخ باید با قالب YYYY-MM-DD ارسال شود.',
  })
  @IsDateString({}, { message: 'تاریخ سررسید معتبر نیست.' })
  dueBefore?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'شماره صفحه باید عدد صحیح باشد.' })
  @Min(1, { message: 'شماره صفحه باید حداقل ۱ باشد.' })
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'تعداد در هر صفحه باید عدد صحیح باشد.' })
  @Min(1, { message: 'تعداد در هر صفحه باید حداقل ۱ باشد.' })
  @Max(100, { message: 'تعداد در هر صفحه نمی‌تواند بیشتر از ۱۰۰ باشد.' })
  limit = 20;
}
