import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizeIranianPhone } from '../phone-normalizer';

export class ShopLoginDto {
  @ApiProperty({ example: '09123456789', description: 'شماره موبایل فروشگاه' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeIranianPhone(value) : value,
  )
  @IsString({ message: 'شماره موبایل معتبر نیست.' })
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل معتبر نیست.' })
  identifier!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: 'StrongPass123' })
  @IsString({ message: 'رمز عبور معتبر نیست.' })
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' })
  @MaxLength(72, { message: 'رمز عبور معتبر نیست.' })
  password!: string;
}
