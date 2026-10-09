import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '../transaction.enums';

export class TransactionShopDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: TransactionShopDto })
  shop!: TransactionShopDto;

  @ApiProperty({ example: '50000000.00' })
  amount!: string;

  @ApiPropertyOptional({ nullable: true, example: 'خرید یخچال' })
  description!: string | null;

  @ApiProperty({ enum: TransactionStatus })
  status!: TransactionStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class TransactionLoanBalanceDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['active', 'completed'] })
  status!: string;

  @ApiProperty({ example: '25000000.00' })
  remainingBalance!: string;
}

export class CreateTransactionResponseDto extends TransactionResponseDto {
  @ApiProperty({ type: TransactionLoanBalanceDto })
  loan!: TransactionLoanBalanceDto;
}

export class PaginatedTransactionResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  items!: TransactionResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;
}
