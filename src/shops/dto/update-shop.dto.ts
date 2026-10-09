import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateShopDto {
  @ApiPropertyOptional({ example: 'فروشگاه نمونه', maxLength: 160 })
  @IsOptional()
  @IsString({ message: 'نام فروشگاه معتبر نیست.' })
  @MinLength(1, { message: 'نام فروشگاه معتبر نیست.' })
  @Matches(/\S/, { message: 'نام فروشگاه معتبر نیست.' })
  @MaxLength(160, { message: 'نام فروشگاه نباید بیشتر از ۱۶۰ کاراکتر باشد.' })
  name?: string;

  @ApiPropertyOptional({ example: 'علی رضایی', maxLength: 120 })
  @IsOptional()
  @IsString({ message: 'نام مالک فروشگاه معتبر نیست.' })
  @MinLength(1, { message: 'نام مالک فروشگاه معتبر نیست.' })
  @Matches(/\S/, { message: 'نام مالک فروشگاه معتبر نیست.' })
  @MaxLength(120, { message: 'نام مالک فروشگاه معتبر نیست.' })
  ownerName?: string;

  @ApiPropertyOptional({ example: '09120000000', pattern: '^09\\d{9}$' })
  @IsOptional()
  @IsString({ message: 'شماره تماس معتبر نیست.' })
  @Matches(/^09\d{9}$/, { message: 'شماره تماس معتبر نیست.' })
  phone?: string;

  @ApiPropertyOptional({ example: 'تهران', maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'نشانی فروشگاه معتبر نیست.' })
  @MinLength(1, { message: 'نشانی فروشگاه معتبر نیست.' })
  @Matches(/\S/, { message: 'نشانی فروشگاه معتبر نیست.' })
  @MaxLength(500, { message: 'نشانی فروشگاه معتبر نیست.' })
  address?: string;

  @ApiPropertyOptional({ example: 'فروشگاه لوازم خانگی', maxLength: 1000 })
  @IsOptional()
  @IsString({ message: 'توضیحات فروشگاه معتبر نیست.' })
  @MaxLength(1000, { message: 'توضیحات فروشگاه معتبر نیست.' })
  description?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: 'وضعیت فعال بودن فروشگاه معتبر نیست.' })
  isActive?: boolean;
}
