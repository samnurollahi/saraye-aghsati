import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '../../transactions/transaction.enums';

export class ShopProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  ownerName!: string;

  @ApiProperty({ example: '09123456789' })
  phone!: string;

  @ApiProperty()
  address!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class ShopAuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: ShopProfileResponseDto })
  shop!: ShopProfileResponseDto;
}

export class ShopSetupTokenResponseDto {
  @ApiProperty({
    description: 'توکن یک‌بارمصرف؛ فقط در این پاسخ نمایش داده می‌شود.',
  })
  setupToken!: string;

  @ApiProperty({ example: '09123456789' })
  loginIdentifier!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;
}

export class ShopTransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '12500000.00' })
  amount!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: TransactionStatus })
  status!: TransactionStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class ShopDashboardResponseDto {
  @ApiProperty({ type: ShopProfileResponseDto })
  shop!: ShopProfileResponseDto;

  @ApiProperty({ example: 12 })
  transactionCount!: number;

  @ApiProperty({ example: '150000000.00' })
  totalTransactionAmount!: string;

  @ApiProperty({ type: ShopTransactionResponseDto, isArray: true })
  recentTransactions!: ShopTransactionResponseDto[];
}

export class PaginatedShopTransactionResponseDto {
  @ApiProperty({ type: ShopTransactionResponseDto, isArray: true })
  items!: ShopTransactionResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
