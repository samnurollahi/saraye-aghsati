import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Loan } from '../loans/entities/loan.entity';
import { LoanStatus } from '../loans/loan.enums';
import { Shop } from '../shops/entities/shop.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionPaginationDto } from './dto/transaction-pagination.dto';
import {
  CreateTransactionResponseDto,
  PaginatedTransactionResponseDto,
  TransactionResponseDto,
} from './dto/transaction-response.dto';
import { Transaction } from './entities/transaction.entity';
import { TransactionStatus } from './transaction.enums';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateTransactionDto,
  ): Promise<CreateTransactionResponseDto> {
    const amountCents = toCents(dto.amount);
    if (amountCents <= 0n) {
      throw new BadRequestException('مبلغ باید بیشتر از صفر باشد.');
    }

    return this.dataSource.transaction(async (manager) => {
      const shop = await manager.getRepository(Shop).findOne({
        where: { id: dto.shopId, isActive: true },
        select: { id: true, name: true },
      });
      if (!shop) {
        throw new NotFoundException('فروشگاه فعال یافت نشد.');
      }

      const loan = await manager
        .getRepository(Loan)
        .createQueryBuilder('loan')
        .where('loan.userId = :userId', { userId: user.userId })
        .andWhere('loan.status = :status', { status: LoanStatus.ACTIVE })
        .orderBy('loan.createdAt', 'ASC')
        .setLock('pessimistic_write')
        .getOne();

      if (!loan) {
        throw new ConflictException('وام فعال برای این کاربر یافت نشد.');
      }

      const remainingCents = toCents(loan.remainingBalance);
      if (remainingCents < amountCents) {
        throw new ConflictException('موجودی وام برای این خرید کافی نیست.');
      }

      const transactionRepository = manager.getRepository(Transaction);
      const transaction = await transactionRepository.save(
        transactionRepository.create({
          userId: user.userId,
          loanId: loan.id,
          shopId: shop.id,
          amount: fromCents(amountCents),
          description: dto.description ?? null,
          status: TransactionStatus.COMPLETED,
        }),
      );

      loan.remainingBalance = fromCents(remainingCents - amountCents);
      loan.status = LoanStatus.ACTIVE;
      await manager.getRepository(Loan).save(loan);

      return {
        ...toTransactionResponse(transaction, shop),
        loan: {
          id: loan.id,
          status: loan.status,
          remainingBalance: loan.remainingBalance,
        },
      };
    });
  }

  async getMyTransactions(
    user: AuthenticatedUser,
    pagination: TransactionPaginationDto,
  ): Promise<PaginatedTransactionResponseDto> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const [transactions, total] =
      await this.transactionsRepository.findAndCount({
        where: { userId: user.userId },
        relations: { shop: true },
        withDeleted: true,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    return {
      items: transactions.map((transaction) =>
        toTransactionResponse(transaction, transaction.shop),
      ),
      page,
      limit,
      total,
    };
  }
}

function toCents(value: string): bigint {
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new BadRequestException('مبلغ باید حداکثر دو رقم اعشار داشته باشد.');
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

function fromCents(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}

function toTransactionResponse(
  transaction: Transaction,
  shop: Pick<Shop, 'id' | 'name'>,
): TransactionResponseDto {
  return {
    id: transaction.id,
    shop: { id: shop.id, name: shop.name },
    amount: transaction.amount,
    description: transaction.description,
    status: transaction.status,
    createdAt: transaction.createdAt,
  };
}
