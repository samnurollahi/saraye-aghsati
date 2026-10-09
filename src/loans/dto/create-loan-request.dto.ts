import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Matches, Min } from 'class-validator';

export class CreateLoanRequestDto {
  @ApiProperty({ type: Number, example: 100000000, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'مبلغ درخواست باید عدد معتبر با حداکثر دو رقم اعشار باشد.' },
  )
  @Min(0.01, { message: 'مبلغ درخواست باید بیشتر از صفر باشد.' })
  requestedAmount!: number;

  @ApiProperty({ example: 'خرید یخچال برای منزل' })
  @IsString({ message: 'توضیحات درخواست باید متن باشد.' })
  @IsNotEmpty({ message: 'توضیحات درخواست الزامی است.' })
  @Matches(/\S/, { message: 'توضیحات درخواست الزامی است.' })
  purpose!: string;
}
