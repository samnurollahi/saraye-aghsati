import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'توکن دسترسی کوتاه‌مدت' })
  accessToken!: string;

  @ApiProperty({ description: 'توکن تمدید یک‌بارمصرف و چرخشی' })
  refreshToken!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
