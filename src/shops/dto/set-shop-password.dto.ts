import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetShopPasswordDto {
  @ApiProperty({ example: 'one-time-setup-token', maxLength: 128 })
  @IsString({ message: 'توکن راه‌اندازی الزامی است.' })
  @MinLength(20, { message: 'توکن راه‌اندازی معتبر نیست.' })
  @MaxLength(128, { message: 'توکن راه‌اندازی معتبر نیست.' })
  setupToken!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: 'StrongPass123' })
  @IsString({ message: 'رمز عبور معتبر نیست.' })
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' })
  @MaxLength(72, { message: 'رمز عبور معتبر نیست.' })
  password!: string;
}
