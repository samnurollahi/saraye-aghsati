import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'شماره موبایل یا کد ملی',
    example: '09123456789',
  })
  @IsString({ message: 'شماره موبایل یا کد ملی الزامی است.' })
  @IsNotEmpty({ message: 'شماره موبایل یا کد ملی الزامی است.' })
  identifier!: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString({ message: 'رمز عبور الزامی است.' })
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' })
  @MaxLength(72, { message: 'رمز عبور معتبر نیست.' })
  password!: string;
}
