import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token صادرشده هنگام ورود' })
  @IsString({ message: 'رفرش توکن الزامی است.' })
  @IsNotEmpty({ message: 'رفرش توکن الزامی است.' })
  refreshToken!: string;
}
