import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Loan } from '../loans/entities/loan.entity';
import { LoanStatus } from '../loans/loan.enums';
import { Shop } from '../shops/entities/shop.entity';
import { UserRole } from '../users/user-role.enum';
import { Transaction } from './entities/transaction.entity';
import { TransactionStatus } from './transaction.enums';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  const user: AuthenticatedUser = { userId: 'user-a', role: UserRole.USER };
  const shop = { id: 'shop-id', name: 'فروشگاه' } as Shop;
  let service: TransactionsService;
  let loan: Loan;
  let shopRepository: { findOne: jest.Mock };
  let loanRepository: { createQueryBuilder: jest.Mock; save: jest.Mock };
  let transactionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
  };
  let queryBuilder: Record<string, jest.Mock>;
  let manager: { getRepository: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    loan = {
      id: 'loan-a',
      userId: 'user-a',
      status: LoanStatus.ACTIVE,
      remainingBalance: '1000.00',
    } as Loan;
    shopRepository = {
      findOne: jest
        .fn()
        .mockImplementation(
          (options: { where: { id: string; isActive: boolean } }) =>
            Promise.resolve(
              options.where.isActive && options.where.id === shop.id
                ? shop
                : null,
            ),
        ),
    };
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(loan),
    };
    loanRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      save: jest.fn((value: Loan) => Promise.resolve(value)),
    };
    transactionRepository = {
      create: jest.fn((value: Partial<Transaction>) => value),
      save: jest.fn((value: Partial<Transaction>) =>
        Promise.resolve({
          ...value,
          id: 'transaction-id',
          createdAt: new Date('2026-10-08T12:00:00.000Z'),
        } as Transaction),
      ),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Shop) return shopRepository;
        if (entity === Loan) return loanRepository;
        if (entity === Transaction) return transactionRepository;
        throw new Error('Unexpected repository');
      }),
    };
    dataSource = {
      transaction: jest.fn(
        (callback: (transactionManager: EntityManager) => unknown) =>
          Promise.resolve(callback(manager as unknown as EntityManager)),
      ),
    };
    service = new TransactionsService(
      dataSource as unknown as DataSource,
      transactionRepository as never,
    );
  });

  it('creates a completed transaction and returns the exact remaining balance', async () => {
    const result = await service.create(user, {
      shopId: shop.id,
      amount: '700.25',
      description: 'خرید یخچال',
    });

    expect(result).toMatchObject({
      id: 'transaction-id',
      shop: { id: shop.id, name: shop.name },
      amount: '700.25',
      status: TransactionStatus.COMPLETED,
      loan: {
        id: loan.id,
        remainingBalance: '299.75',
        status: LoanStatus.ACTIVE,
      },
    });
    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-a', loanId: 'loan-a' }),
    );
    expect(queryBuilder.where).toHaveBeenCalledWith('loan.userId = :userId', {
      userId: 'user-a',
    });
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
  });

  it.each(['0', '-1', '1.001'])('rejects invalid amount %s', async (amount) => {
    await expect(
      service.create(user, { shopId: shop.id, amount }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects an amount greater than the locked loan balance without writing', async () => {
    await expect(
      service.create(user, { shopId: shop.id, amount: '1000.01' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transactionRepository.save).not.toHaveBeenCalled();
    expect(loan.remainingBalance).toBe('1000.00');
  });

  it('keeps the loan active when the transaction spends the exact available balance', async () => {
    const result = await service.create(user, {
      shopId: shop.id,
      amount: '1000',
    });
    expect(result.loan).toEqual({
      id: loan.id,
      status: LoanStatus.ACTIVE,
      remainingBalance: '0.00',
    });
  });

  it('rejects an inactive or missing shop', async () => {
    shopRepository.findOne.mockResolvedValue(null);
    await expect(
      service.create(user, { shopId: shop.id, amount: '1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(loanRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects users without an active loan', async () => {
    queryBuilder.getOne.mockResolvedValue(null);
    await expect(
      service.create(user, { shopId: shop.id, amount: '1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('lists transactions using only JWT ownership and pagination', async () => {
    await service.getMyTransactions(user, { page: 2, limit: 5 });
    expect(transactionRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-a' },
        withDeleted: true,
        skip: 5,
        take: 5,
      }),
    );
  });

  it('allows only one of two concurrent spends against the same balance', async () => {
    let transactionTail = Promise.resolve();
    dataSource.transaction.mockImplementation(
      async (callback: (transactionManager: EntityManager) => unknown) => {
        const previous = transactionTail;
        let release!: () => void;
        transactionTail = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await Promise.resolve(
            callback(manager as unknown as EntityManager),
          );
        } finally {
          release();
        }
      },
    );

    const outcomes = await Promise.allSettled([
      service.create(user, { shopId: shop.id, amount: '700' }),
      service.create(user, { shopId: shop.id, amount: '600' }),
    ]);

    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === 'rejected'),
    ).toHaveLength(1);
    expect(loan.remainingBalance).toBe('300.00');
    expect(loan.remainingBalance).not.toBe('-300.00');
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
  });
});
