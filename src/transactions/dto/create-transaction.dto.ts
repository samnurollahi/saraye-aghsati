import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'شناسه فروشگاه معتبر نیست.' })
  shopId!: string;

  @ApiProperty({
    type: String,
    example: '50000000.00',
    description:
      'مبلغ مثبت با حداکثر دو رقم اعشار؛ مقدار عددی نیز پذیرفته می‌شود.',
  })
  @Transform(({ value }: TransformFnParams) => normalizeAmount(value))
  @IsString({ message: 'مبلغ باید عددی باشد.' })
  @Matches(/^(?=.*[1-9])\d{1,12}(?:\.\d{1,2})?$/, {
    message: 'مبلغ باید مثبت و حداکثر دارای دو رقم اعشار باشد.',
  })
  amount!: string;

  @ApiPropertyOptional({ maxLength: 500, example: 'خرید یخچال' })
  @IsOptional()
  @IsString({ message: 'توضیحات باید متن باشد.' })
  @MaxLength(500, { message: 'توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.' })
  description?: string;
}

function normalizeAmount(value: unknown): unknown {
  return typeof value === 'number' ? String(value) : value;
}
