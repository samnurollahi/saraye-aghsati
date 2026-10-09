import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateShopDto {
  @ApiProperty({ example: 'فروشگاه نمونه', maxLength: 160 })
  @IsString({ message: 'نام فروشگاه الزامی است.' })
  @MinLength(1, { message: 'نام فروشگاه الزامی است.' })
  @Matches(/\S/, { message: 'نام فروشگاه الزامی است.' })
  @MaxLength(160, { message: 'نام فروشگاه نباید بیشتر از ۱۶۰ کاراکتر باشد.' })
  name!: string;

  @ApiProperty({ example: 'علی رضایی', maxLength: 120 })
  @IsString({ message: 'نام مالک فروشگاه الزامی است.' })
  @MinLength(1, { message: 'نام مالک فروشگاه الزامی است.' })
  @Matches(/\S/, { message: 'نام مالک فروشگاه الزامی است.' })
  @MaxLength(120, { message: 'نام مالک فروشگاه معتبر نیست.' })
  ownerName!: string;

  @ApiProperty({ example: '09120000000', pattern: '^09\\d{9}$' })
  @IsString({ message: 'شماره تماس معتبر نیست.' })
  @Matches(/^09\d{9}$/, { message: 'شماره تماس معتبر نیست.' })
  phone!: string;

  @ApiProperty({ example: 'تهران', maxLength: 500 })
  @IsString({ message: 'نشانی فروشگاه الزامی است.' })
  @MinLength(1, { message: 'نشانی فروشگاه الزامی است.' })
  @Matches(/\S/, { message: 'نشانی فروشگاه الزامی است.' })
  @MaxLength(500, { message: 'نشانی فروشگاه معتبر نیست.' })
  address!: string;

  @ApiPropertyOptional({ example: 'فروشگاه لوازم خانگی', maxLength: 1000 })
  @IsOptional()
  @IsString({ message: 'توضیحات فروشگاه معتبر نیست.' })
  @MaxLength(1000, { message: 'توضیحات فروشگاه معتبر نیست.' })
  description?: string;
}
