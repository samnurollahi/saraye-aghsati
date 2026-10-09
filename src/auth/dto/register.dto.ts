import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsIranianNationalCode } from '../../common/validators/iranian-national-code.validator';

export class RegisterDto {
  @ApiProperty({ example: 'علی رضایی', maxLength: 120 })
  @IsString({ message: 'نام باید متن باشد.' })
  @IsNotEmpty({ message: 'نام الزامی است.' })
  @MaxLength(120, { message: 'نام نمی‌تواند بیشتر از ۱۲۰ کاراکتر باشد.' })
  fullName!: string;

  @ApiProperty({ example: '0067995942', minLength: 10, maxLength: 10 })
  @IsString({ message: 'کد ملی باید متن باشد.' })
  nationalCode!: string;

  @ApiProperty({ example: '09123456789', minLength: 11, maxLength: 11 })
  @IsString({ message: 'شماره موبایل باید متن باشد.' })
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل معتبر نیست.' })
  phone!: string;

  @ApiPropertyOptional({ example: 'ali@example.com', nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'ایمیل معتبر نیست.' })
  @MaxLength(254, { message: 'ایمیل نمی‌تواند بیشتر از ۲۵۴ کاراکتر باشد.' })
  email?: string | null;

  @ApiProperty({ minLength: 8, maxLength: 72, example: 'StrongPass123' })
  @IsString({ message: 'رمز عبور باید متن باشد.' })
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' })
  @MaxLength(72, { message: 'رمز عبور نمی‌تواند بیشتر از ۷۲ کاراکتر باشد.' })
  password!: string;
}
