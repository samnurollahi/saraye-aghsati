import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/user-role.enum';
import { ApproveLoanRequestDto } from './dto/approve-loan-request.dto';
import { AdminInstallmentFilterDto } from './dto/admin-installment-filter.dto';
import { CreateLoanRequestDto } from './dto/create-loan-request.dto';
import { Installment } from './entities/installment.entity';
import { Loan } from './entities/loan.entity';
import { LoanRequest } from './entities/loan-request.entity';
import { InstallmentStatus, LoanRequestStatus, LoanStatus } from './loan.enums';
import { LoansService } from './loans.service';

describe('LoansService', () => {
  const user: AuthenticatedUser = { userId: 'user-id', role: UserRole.USER };
  const admin: AuthenticatedUser = {
    userId: 'admin-id',
    role: UserRole.ADMIN,
  };
  const now = new Date('2026-10-01T12:00:00.000Z');
  let service: LoansService;
  let requestRecord: LoanRequest;
  let installmentRecord: Installment;
  let loanRecord: Loan;
  let unpaidInstallmentCount: number;
  let installmentLookupBuilder: Record<string, jest.Mock>;
  let installmentCountBuilder: Record<string, jest.Mock>;
  let loanLockBuilder: Record<string, jest.Mock>;
  let dataSource: {
    getRepository: jest.Mock;
    transaction: jest.Mock;
  };
  let requestRepository: Record<string, jest.Mock>;
  let loanRepository: Record<string, jest.Mock>;
  let installmentRepository: Record<string, jest.Mock>;
  let userRepository: Record<string, jest.Mock>;
  let manager: { getRepository: jest.Mock };

  const approval: ApproveLoanRequestDto = {
    principalAmount: 100,
    interestRate: 10,
    installmentCount: 3,
    startDate: '2026-01-31',
  };

  beforeEach(() => {
    let installmentQueryCount = 0;
    unpaidInstallmentCount = 1;
    loanRecord = {
      id: 'loan-id',
      userId: 'user-id',
      status: LoanStatus.ACTIVE,
      remainingBalance: '75.00',
      user: { id: 'user-id', fullName: 'کاربر نمونه' },
    } as Loan;
    installmentRecord = {
      id: 'installment-id',
      loanId: 'loan-id',
      installmentNumber: 1,
      dueDate: '2026-09-01',
      amount: '25.00',
      status: InstallmentStatus.PENDING,
      paidAt: null,
      paidConfirmedBy: null,
    } as Installment;
    installmentLookupBuilder = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn(() => Promise.resolve(installmentRecord)),
    };
    installmentCountBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(() => Promise.resolve(unpaidInstallmentCount)),
    };
    loanLockBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn(() => Promise.resolve(loanRecord)),
    };
    requestRecord = {
      id: 'request-id',
      userId: 'user-id',
      requestedAmount: '100.00',
      purpose: 'خرید یخچال',
      status: LoanRequestStatus.PENDING,
      adminNote: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    } as LoanRequest;
    requestRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        ...value,
        id: value.id ?? 'request-id',
        createdAt: value.createdAt ?? now,
        updatedAt: now,
      })),
      findOne: jest.fn(async () => requestRecord),
      find: jest.fn(async () => [requestRecord]),
    };
    loanRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: 'loan-id' })),
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      createQueryBuilder: jest.fn(() => loanLockBuilder),
    };
    installmentRepository = {
      create: jest.fn((value) => value),
      find: jest.fn(async () => []),
      save: jest.fn(async (values) =>
        Array.isArray(values)
          ? values.map((value: object, index: number) => ({
              ...value,
              id: `installment-${index + 1}`,
            }))
          : values,
      ),
      createQueryBuilder: jest.fn(() => {
        const builder =
          installmentQueryCount % 2 === 0
            ? installmentLookupBuilder
            : installmentCountBuilder;
        installmentQueryCount += 1;
        return builder;
      }),
    };
    userRepository = { find: jest.fn(async () => []) };
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === LoanRequest) return requestRepository;
        if (entity === Loan) return loanRepository;
        if (entity === Installment) return installmentRepository;
        throw new Error('Unexpected repository');
      }),
    };
    dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === LoanRequest) return requestRepository;
        if (entity === Loan) return loanRepository;
        if (entity === Installment) return installmentRepository;
        if (entity === User) return userRepository;
        throw new Error('Unexpected repository');
      }),
      transaction: jest.fn(
        async (callback: (transactionManager: EntityManager) => unknown) =>
          callback(manager as unknown as EntityManager),
      ),
    };
    service = new LoansService(dataSource as unknown as DataSource);
  });

  it('creates a pending request with userId from the authenticated user', async () => {
    const dto: CreateLoanRequestDto = {
      requestedAmount: 123.45,
      purpose: 'خرید ماشین لباسشویی',
    };

    const result = await service.createRequest(user, dto);

    expect(requestRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        requestedAmount: '123.45',
        status: LoanRequestStatus.PENDING,
        reviewedBy: null,
        reviewedAt: null,
      }),
    );
    expect(result.status).toBe(LoanRequestStatus.PENDING);
  });

  it('lists only the current user loan requests without admin identity fields', async () => {
    const result = await service.getMyRequests(user);

    expect(requestRepository.find).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      order: { createdAt: 'DESC' },
    });
    expect(result[0]).toMatchObject({
      id: 'request-id',
      requestedAmount: '100.00',
      status: LoanRequestStatus.PENDING,
    });
    expect(result[0]).not.toHaveProperty('userId');
    expect(result[0]).not.toHaveProperty('reviewedBy');
  });

  it('lists only the current user loans', async () => {
    loanRepository.find.mockResolvedValue([
      {
        id: 'loan-id',
        userId: 'user-id',
        principalAmount: '100.00',
        interestRate: '10',
        totalAmount: '110.00',
        installmentCount: 2,
        installmentAmount: '55.00',
        startDate: '2026-10-01',
        status: LoanStatus.ACTIVE,
        remainingBalance: '110.00',
        createdAt: now,
      },
    ]);

    const result = await service.getMyLoans(user);

    expect(loanRepository.find).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      order: { createdAt: 'DESC' },
    });
    expect(result[0]).toMatchObject({
      id: 'loan-id',
      status: LoanStatus.ACTIVE,
    });
    expect(result[0]).not.toHaveProperty('userId');
  });

  it('checks loan ownership before listing ordered installments', async () => {
    loanRepository.findOne.mockResolvedValue({ id: 'loan-id' });
    installmentRepository.find.mockResolvedValue([
      {
        id: 'installment-1',
        installmentNumber: 1,
        dueDate: '2026-09-01',
        status: InstallmentStatus.PENDING,
        paidConfirmedBy: 'admin-id',
      },
    ]);

    const result = await service.getMyInstallments('loan-id', user);

    expect(loanRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'loan-id', userId: 'user-id' },
      select: { id: true },
    });
    expect(installmentRepository.find).toHaveBeenCalledWith({
      where: { loanId: 'loan-id' },
      order: { installmentNumber: 'ASC' },
    });
    expect(result[0]).not.toHaveProperty('paidConfirmedBy');
    expect(result[0]?.status).toBe(InstallmentStatus.OVERDUE);
  });

  it('does not reveal or query installments for a loan owned by another user', async () => {
    loanRepository.findOne.mockResolvedValue(null);

    await expect(service.getMyInstallments('other-loan', user)).rejects.toThrow(
      new NotFoundException('وام یافت نشد.'),
    );
    expect(installmentRepository.find).not.toHaveBeenCalled();
  });

  it.each(Object.values(LoanRequestStatus))(
    'filters admin loan requests by %s status',
    async (status) => {
      requestRepository.find.mockResolvedValue([]);

      await service.getAdminRequests({ status });

      expect(requestRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status } }),
      );
    },
  );

  it('lists all statuses when admin request status is omitted', async () => {
    requestRepository.find.mockResolvedValue([]);

    await service.getAdminRequests({});

    expect(requestRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('includes the user summary in admin installment responses', async () => {
    const queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: 'installment-id',
            loanId: 'loan-id',
            installmentNumber: 1,
            dueDate: '2026-09-01',
            amount: '25.00',
            status: InstallmentStatus.PENDING,
            paidAt: null,
            paidConfirmedBy: null,
            loan: {
              userId: 'user-id',
              user: {
                id: 'user-id',
                fullName: 'کاربر نمونه',
                nationalCode: '0012345678',
                phone: '09123456789',
                email: 'user@example.com',
              },
            },
          },
        ],
        1,
      ]),
    };
    installmentRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getAdminInstallments(
      new AdminInstallmentFilterDto(),
    );

    expect(result.items[0]).toMatchObject({
      id: 'installment-id',
      loanId: 'loan-id',
      user: {
        id: 'user-id',
        fullName: 'کاربر نمونه',
        nationalCode: '0012345678',
        phone: '09123456789',
        email: 'user@example.com',
      },
    });
    expect(result.items[0]).not.toHaveProperty('userId');
    expect(result.items[0]).not.toHaveProperty('userFullName');
  });

  it('approves a request and creates a loan with exact installment totals and safe monthly dates', async () => {
    const result = await service.approveRequest('request-id', admin, approval);

    expect(result.loanRequest.status).toBe(LoanRequestStatus.APPROVED);
    expect(result.loanRequest.reviewedBy).toBe('admin-id');
    expect(result.loanRequest.reviewedAt).toBeInstanceOf(Date);
    expect(result.loan).toMatchObject({
      principalAmount: '100.00',
      totalAmount: '110.00',
      installmentCount: 3,
      installmentAmount: '36.66',
      remainingBalance: '110.00',
      status: LoanStatus.ACTIVE,
    });
    expect(result.installments).toHaveLength(3);
    expect(result.installments.map(({ dueDate }) => dueDate)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
    expect(result.installments.map(({ amount }) => amount)).toEqual([
      '36.66',
      '36.66',
      '36.68',
    ]);
    expect(
      result.installments.reduce((total, installment) => {
        const [whole, fractional] = installment.amount.split('.');
        return total + Number(whole) * 100 + Number(fractional);
      }, 0),
    ).toBe(11000);
    expect(
      result.installments.every(
        ({ status }) => status === InstallmentStatus.PENDING,
      ),
    ).toBe(true);
  });

  it('rounds interest to cents deterministically', async () => {
    const result = await service.approveRequest('request-id', admin, {
      ...approval,
      interestRate: 10.555,
      installmentCount: 1,
    });

    expect(result.loan.totalAmount).toBe('110.56');
    expect(result.installments[0]?.amount).toBe('110.56');
  });

  it('rejects a request with admin review details and creates no loan', async () => {
    const result = await service.rejectRequest('request-id', admin, {
      adminNote: 'مدارک کافی نیست.',
    });

    expect(result).toMatchObject({
      status: LoanRequestStatus.REJECTED,
      adminNote: 'مدارک کافی نیست.',
      reviewedBy: 'admin-id',
    });
    expect(result.reviewedAt).toBeInstanceOf(Date);
    expect(loanRepository.save).not.toHaveBeenCalled();
    expect(installmentRepository.save).not.toHaveBeenCalled();
  });

  it('does not allow approving a reviewed request again', async () => {
    requestRecord.status = LoanRequestStatus.REJECTED;

    await expect(
      service.approveRequest('request-id', admin, approval),
    ).rejects.toThrow(
      new ConflictException('این درخواست قبلاً بررسی شده است.'),
    );
    expect(loanRepository.save).not.toHaveBeenCalled();
  });

  it('does not allow rejecting a reviewed request again', async () => {
    requestRecord.status = LoanRequestStatus.APPROVED;

    await expect(
      service.rejectRequest('request-id', admin, {}),
    ).rejects.toThrow(
      new ConflictException('این درخواست قبلاً بررسی شده است.'),
    );
  });

  it('reports a missing loan request in Persian', async () => {
    requestRepository.findOne.mockResolvedValue(null);

    await expect(
      service.approveRequest('missing-id', admin, approval),
    ).rejects.toThrow(new NotFoundException('درخواست وام یافت نشد.'));
  });

  it('keeps review, loan, and installment persistence inside one transaction on failure', async () => {
    const failure = new Error('database failure');
    installmentRepository.save.mockRejectedValue(failure);

    await expect(
      service.approveRequest('request-id', admin, approval),
    ).rejects.toBe(failure);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(requestRepository.save).toHaveBeenCalledTimes(1);
    expect(loanRepository.save).toHaveBeenCalledTimes(1);
    expect(installmentRepository.save).toHaveBeenCalledTimes(1);
  });

  it('confirms a payment with the supplied paidAt and records the confirming admin', async () => {
    const paidAt = '2026-10-08T12:30:00.000Z';

    const result = await service.confirmInstallmentPayment(
      'installment-id',
      admin,
      { paidAt },
    );

    expect(installmentRecord).toMatchObject({
      status: InstallmentStatus.PAID,
      paidAt: new Date(paidAt),
      paidConfirmedBy: admin.userId,
    });
    expect(result.loanStatus).toBe(LoanStatus.ACTIVE);
    expect(result.remainingBalance).toBe('75.00');
    expect(installmentLookupBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(loanLockBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
  });

  it('defaults paidAt to now and does not decrement spendable loan balance', async () => {
    const before = new Date();
    const result = await service.confirmInstallmentPayment(
      'installment-id',
      admin,
    );
    const after = new Date();

    expect(installmentRecord.paidAt?.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(installmentRecord.paidAt?.getTime()).toBeLessThanOrEqual(
      after.getTime(),
    );
    expect(result.remainingBalance).toBe('75.00');
    expect(loanRecord.remainingBalance).toBe('75.00');
  });

  it('completes a loan only when every installment has been paid', async () => {
    unpaidInstallmentCount = 0;

    const result = await service.confirmInstallmentPayment(
      'installment-id',
      admin,
    );

    expect(loanRecord.status).toBe(LoanStatus.COMPLETED);
    expect(result.loanStatus).toBe(LoanStatus.COMPLETED);
    expect(loanRecord.remainingBalance).toBe('75.00');
  });

  it('does not confirm an already-paid installment twice', async () => {
    installmentRecord.status = InstallmentStatus.PAID;

    await expect(
      service.confirmInstallmentPayment('installment-id', admin),
    ).rejects.toThrow(new ConflictException('این قسط قبلاً پرداخت شده است.'));
    expect(installmentRepository.save).not.toHaveBeenCalled();
    expect(loanRepository.save).not.toHaveBeenCalled();
  });

  it('allows only one concurrent admin confirmation', async () => {
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
      service.confirmInstallmentPayment('installment-id', admin),
      service.confirmInstallmentPayment('installment-id', {
        userId: 'admin-2',
        role: UserRole.ADMIN,
      }),
    ]);

    expect(
      outcomes.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(outcomes.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    expect(installmentRecord.status).toBe(InstallmentStatus.PAID);
    expect(installmentRepository.save).toHaveBeenCalledTimes(1);
  });
});
