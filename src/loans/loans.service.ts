import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthenticatedUser } from '../auth/auth.types';
import { User } from '../users/entities/user.entity';
import { CreateLoanRequestDto } from './dto/create-loan-request.dto';
import { LoanRequestFilterDto } from './dto/loan-request-filter.dto';
import { ApproveLoanRequestDto } from './dto/approve-loan-request.dto';
import { AdminInstallmentFilterDto } from './dto/admin-installment-filter.dto';
import { ConfirmInstallmentPaymentDto } from './dto/confirm-installment-payment.dto';
import { RejectLoanRequestDto } from './dto/reject-loan-request.dto';
import {
  AdminLoanRequestResponseDto,
  AdminLoanResponseDto,
  AdminInstallmentResponseDto,
  AdminUserResponseDto,
  ConfirmInstallmentPaymentResponseDto,
  InstallmentResponseDto,
  LoanApprovalResponseDto,
  MyInstallmentResponseDto,
  MyLoanRequestResponseDto,
  MyLoanResponseDto,
  PaginatedAdminInstallmentResponseDto,
  LoanResponseDto,
  LoanRequestResponseDto,
} from './dto/loan-responses.dto';
import { Installment } from './entities/installment.entity';
import { Loan } from './entities/loan.entity';
import { LoanRequest } from './entities/loan-request.entity';
import { InstallmentStatus, LoanRequestStatus, LoanStatus } from './loan.enums';

function decimalFraction(value: number): [bigint, bigint] {
  const [coefficient, exponentValue] = value
    .toString()
    .toLowerCase()
    .split('e');
  const exponent = Number(exponentValue ?? 0);
  const [integerPart, fractionalPart = ''] = coefficient.split('.');
  const digits = BigInt(`${integerPart}${fractionalPart}`);
  const scale = fractionalPart.length - exponent;
  return scale <= 0
    ? [digits * 10n ** BigInt(-scale), 1n]
    : [digits, 10n ** BigInt(scale)];
}

function amountToCents(amount: number): bigint {
  const [numerator, denominator] = decimalFraction(amount);
  return (numerator * 100n) / denominator;
}

function formatCents(cents: bigint): string {
  const whole = cents / 100n;
  const fractional = (cents % 100n).toString().padStart(2, '0');
  return `${whole}.${fractional}`;
}

function roundedDivide(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(startDate: Date, monthOffset: number): string {
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth() + monthOffset;
  const day = startDate.getUTCDate();
  const targetMonth = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  targetMonth.setUTCDate(Math.min(day, lastDay));
  return targetMonth.toISOString().slice(0, 10);
}

function toLoanRequestResponse(request: LoanRequest): LoanRequestResponseDto {
  return {
    id: request.id,
    userId: request.userId,
    requestedAmount: request.requestedAmount,
    purpose: request.purpose,
    status: request.status,
    adminNote: request.adminNote,
    reviewedBy: request.reviewedBy,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function toInstallmentResponse(
  installment: Installment,
): InstallmentResponseDto {
  return {
    id: installment.id,
    loanId: installment.loanId,
    installmentNumber: installment.installmentNumber,
    dueDate: installment.dueDate,
    amount: installment.amount,
    status: installment.status,
    paidAt: installment.paidAt,
    paidConfirmedBy: installment.paidConfirmedBy,
  };
}

@Injectable()
export class LoansService {
  constructor(private readonly dataSource: DataSource) {}

  async getMyRequests(
    user: AuthenticatedUser,
  ): Promise<MyLoanRequestResponseDto[]> {
    const requests = await this.dataSource.getRepository(LoanRequest).find({
      where: { userId: user.userId },
      order: { createdAt: 'DESC' },
    });
    return requests.map((request) => ({
      id: request.id,
      requestedAmount: request.requestedAmount,
      purpose: request.purpose,
      status: request.status,
      adminNote: request.adminNote,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    }));
  }

  async getMyLoans(user: AuthenticatedUser): Promise<MyLoanResponseDto[]> {
    const loans = await this.dataSource.getRepository(Loan).find({
      where: { userId: user.userId },
      order: { createdAt: 'DESC' },
    });
    return loans.map((loan) => ({
      id: loan.id,
      principalAmount: loan.principalAmount,
      interestRate: loan.interestRate,
      totalAmount: loan.totalAmount,
      installmentCount: loan.installmentCount,
      installmentAmount: loan.installmentAmount,
      startDate: loan.startDate,
      status: loan.status,
      remainingBalance: loan.remainingBalance,
      createdAt: loan.createdAt,
    }));
  }

  async getMyInstallments(
    loanId: string,
    user: AuthenticatedUser,
  ): Promise<MyInstallmentResponseDto[]> {
    const loan = await this.dataSource.getRepository(Loan).findOne({
      where: { id: loanId, userId: user.userId },
      select: { id: true },
    });
    if (!loan) {
      throw new NotFoundException('وام یافت نشد.');
    }
    const installments = await this.dataSource.getRepository(Installment).find({
      where: { loanId: loan.id },
      order: { installmentNumber: 'ASC' },
    });
    const today = utcToday();
    return installments.map((installment) => ({
      id: installment.id,
      installmentNumber: installment.installmentNumber,
      dueDate: installment.dueDate,
      amount: installment.amount,
      status:
        installment.status === InstallmentStatus.PENDING &&
        installment.dueDate < today
          ? InstallmentStatus.OVERDUE
          : installment.status,
      paidAt: installment.paidAt,
    }));
  }

  async getAdminRequests(
    filter: LoanRequestFilterDto,
  ): Promise<AdminLoanRequestResponseDto[]> {
    const requests = await this.dataSource.getRepository(LoanRequest).find({
      where: filter.status ? { status: filter.status } : {},
      relations: { user: true },
      select: {
        id: true,
        userId: true,
        requestedAmount: true,
        purpose: true,
        status: true,
        adminNote: true,
        reviewedBy: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          fullName: true,
          nationalCode: true,
          phone: true,
          email: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
    return requests.map((request) => this.toAdminRequestResponse(request));
  }

  async getAdminRequest(
    requestId: string,
  ): Promise<AdminLoanRequestResponseDto> {
    const request = await this.dataSource.getRepository(LoanRequest).findOne({
      where: { id: requestId },
      relations: { user: true },
      select: {
        id: true,
        userId: true,
        requestedAmount: true,
        purpose: true,
        status: true,
        adminNote: true,
        reviewedBy: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          fullName: true,
          nationalCode: true,
          phone: true,
          email: true,
        },
      },
    });
    if (!request) {
      throw new NotFoundException('درخواست وام یافت نشد.');
    }
    const response = this.toAdminRequestResponse(request);
    if (request.status === LoanRequestStatus.APPROVED) {
      const loan = await this.dataSource.getRepository(Loan).findOne({
        where: { loanRequestId: request.id },
      });
      if (loan) response.loan = this.toLoanResponse(loan);
    }
    return response;
  }

  async getAdminLoans(): Promise<AdminLoanResponseDto[]> {
    const loans = await this.dataSource.getRepository(Loan).find({
      relations: { user: true },
      select: {
        id: true,
        userId: true,
        loanRequestId: true,
        principalAmount: true,
        interestRate: true,
        totalAmount: true,
        installmentCount: true,
        installmentAmount: true,
        startDate: true,
        status: true,
        remainingBalance: true,
        createdAt: true,
        user: {
          id: true,
          fullName: true,
          nationalCode: true,
          phone: true,
          email: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
    return loans.map((loan) => this.toAdminLoanResponse(loan));
  }

  async getAdminInstallments(
    filter: AdminInstallmentFilterDto,
  ): Promise<PaginatedAdminInstallmentResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const today = utcToday();
    const query = this.dataSource
      .getRepository(Installment)
      .createQueryBuilder('installment')
      .innerJoinAndSelect('installment.loan', 'loan')
      .innerJoinAndSelect('loan.user', 'user');

    if (filter.status === InstallmentStatus.PENDING) {
      query
        .where('installment.status = :pending', {
          pending: InstallmentStatus.PENDING,
        })
        .andWhere('installment.dueDate >= :today', { today });
    } else if (filter.status === InstallmentStatus.OVERDUE) {
      query.where(
        '(installment.status = :overdue OR (installment.status = :pending AND installment.dueDate < :today))',
        {
          overdue: InstallmentStatus.OVERDUE,
          pending: InstallmentStatus.PENDING,
          today,
        },
      );
    }
    if (filter.dueBefore) {
      query.andWhere('installment.dueDate <= :dueBefore', {
        dueBefore: filter.dueBefore,
      });
    }

    const [installments, total] = await query
      .orderBy('installment.dueDate', 'ASC')
      .addOrderBy('installment.installmentNumber', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: installments.map((installment) =>
        this.toAdminInstallmentResponse(installment, today),
      ),
      page,
      limit,
      total,
    };
  }

  async getAdminLoan(loanId: string): Promise<AdminLoanResponseDto> {
    const loan = await this.dataSource.getRepository(Loan).findOne({
      where: { id: loanId },
      relations: { user: true },
      select: {
        id: true,
        userId: true,
        loanRequestId: true,
        principalAmount: true,
        interestRate: true,
        totalAmount: true,
        installmentCount: true,
        installmentAmount: true,
        startDate: true,
        status: true,
        remainingBalance: true,
        createdAt: true,
        user: {
          id: true,
          fullName: true,
          nationalCode: true,
          phone: true,
          email: true,
        },
      },
    });
    if (!loan) {
      throw new NotFoundException('وام یافت نشد.');
    }
    const installments = await this.dataSource.getRepository(Installment).find({
      where: { loanId: loan.id },
      order: { installmentNumber: 'ASC' },
    });
    return {
      ...this.toAdminLoanResponse(loan),
      installments: installments.map((installment) => ({
        id: installment.id,
        installmentNumber: installment.installmentNumber,
        dueDate: installment.dueDate,
        amount: installment.amount,
        status: installment.status,
        paidAt: installment.paidAt,
      })),
    };
  }

  async getAdminUsers(): Promise<AdminUserResponseDto[]> {
    const users = await this.dataSource.getRepository(User).find({
      select: {
        id: true,
        fullName: true,
        nationalCode: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      nationalCode: user.nationalCode,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  private toAdminRequestResponse(
    request: LoanRequest,
  ): AdminLoanRequestResponseDto {
    return {
      id: request.id,
      user: {
        id: request.user.id,
        fullName: request.user.fullName,
        nationalCode: request.user.nationalCode,
        phone: request.user.phone,
        email: request.user.email,
      },
      requestedAmount: request.requestedAmount,
      purpose: request.purpose,
      status: request.status,
      adminNote: request.adminNote,
      reviewedBy: request.reviewedBy,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private toLoanResponse(loan: Loan): LoanResponseDto {
    return {
      id: loan.id,
      userId: loan.userId,
      loanRequestId: loan.loanRequestId,
      principalAmount: loan.principalAmount,
      interestRate: loan.interestRate,
      totalAmount: loan.totalAmount,
      installmentCount: loan.installmentCount,
      installmentAmount: loan.installmentAmount,
      startDate: loan.startDate,
      status: loan.status,
      remainingBalance: loan.remainingBalance,
    };
  }

  private toAdminLoanResponse(loan: Loan): AdminLoanResponseDto {
    return {
      id: loan.id,
      user: {
        id: loan.user.id,
        fullName: loan.user.fullName,
        nationalCode: loan.user.nationalCode,
        phone: loan.user.phone,
        email: loan.user.email,
      },
      loanRequestId: loan.loanRequestId,
      principalAmount: loan.principalAmount,
      interestRate: loan.interestRate,
      totalAmount: loan.totalAmount,
      installmentCount: loan.installmentCount,
      installmentAmount: loan.installmentAmount,
      startDate: loan.startDate,
      status: loan.status,
      remainingBalance: loan.remainingBalance,
      createdAt: loan.createdAt,
    };
  }

  private toAdminInstallmentResponse(
    installment: Installment,
    today: string,
  ): AdminInstallmentResponseDto {
    return {
      id: installment.id,
      loanId: installment.loanId,
      user: {
        id: installment.loan.user.id,
        fullName: installment.loan.user.fullName,
        nationalCode: installment.loan.user.nationalCode,
        phone: installment.loan.user.phone,
        email: installment.loan.user.email,
      },
      installmentNumber: installment.installmentNumber,
      dueDate: installment.dueDate,
      amount: installment.amount,
      status:
        installment.status === InstallmentStatus.PENDING &&
        installment.dueDate < today
          ? InstallmentStatus.OVERDUE
          : installment.status,
      paidAt: installment.paidAt,
      paidConfirmedBy: installment.paidConfirmedBy,
    };
  }

  async createRequest(
    user: AuthenticatedUser,
    dto: CreateLoanRequestDto,
  ): Promise<LoanRequestResponseDto> {
    const repository = this.dataSource.getRepository(LoanRequest);
    const request = repository.create({
      userId: user.userId,
      requestedAmount: formatCents(amountToCents(dto.requestedAmount)),
      purpose: dto.purpose,
      status: LoanRequestStatus.PENDING,
      adminNote: null,
      reviewedBy: null,
      reviewedAt: null,
    });
    return toLoanRequestResponse(await repository.save(request));
  }

  approveRequest(
    requestId: string,
    admin: AuthenticatedUser,
    dto: ApproveLoanRequestDto,
  ): Promise<LoanApprovalResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.findPendingRequest(manager, requestId);
      const principalCents = amountToCents(dto.principalAmount);
      const [rateNumerator, rateDenominator] = decimalFraction(
        dto.interestRate,
      );
      const interestCents = roundedDivide(
        principalCents * rateNumerator,
        rateDenominator * 100n,
      );
      const totalCents = principalCents + interestCents;
      const baseInstallmentCents = totalCents / BigInt(dto.installmentCount);
      const finalInstallmentCents =
        baseInstallmentCents + (totalCents % BigInt(dto.installmentCount));
      const startDate = new Date(dto.startDate);

      request.status = LoanRequestStatus.APPROVED;
      request.adminNote = dto.adminNote ?? null;
      request.reviewedBy = admin.userId;
      request.reviewedAt = new Date();
      const savedRequest = await manager
        .getRepository(LoanRequest)
        .save(request);

      const loan = await manager.getRepository(Loan).save(
        manager.getRepository(Loan).create({
          userId: request.userId,
          loanRequestId: request.id,
          principalAmount: formatCents(principalCents),
          interestRate: dto.interestRate.toString(),
          totalAmount: formatCents(totalCents),
          installmentCount: dto.installmentCount,
          installmentAmount: formatCents(baseInstallmentCents),
          startDate: startDate.toISOString().slice(0, 10),
          status: LoanStatus.ACTIVE,
          remainingBalance: formatCents(totalCents),
        }),
      );

      const installments = Array.from(
        { length: dto.installmentCount },
        (_, index) => {
          const isFinalInstallment = index === dto.installmentCount - 1;
          return manager.getRepository(Installment).create({
            loanId: loan.id,
            installmentNumber: index + 1,
            dueDate: addMonths(startDate, index),
            amount: formatCents(
              isFinalInstallment ? finalInstallmentCents : baseInstallmentCents,
            ),
            status: InstallmentStatus.PENDING,
            paidAt: null,
            paidConfirmedBy: null,
          });
        },
      );
      const savedInstallments = await manager
        .getRepository(Installment)
        .save(installments);

      return {
        loanRequest: toLoanRequestResponse(savedRequest),
        loan: {
          id: loan.id,
          userId: loan.userId,
          loanRequestId: loan.loanRequestId,
          principalAmount: loan.principalAmount,
          interestRate: loan.interestRate,
          totalAmount: loan.totalAmount,
          installmentCount: loan.installmentCount,
          installmentAmount: loan.installmentAmount,
          startDate: loan.startDate,
          status: loan.status,
          remainingBalance: loan.remainingBalance,
        },
        installments: savedInstallments.map(toInstallmentResponse),
      };
    });
  }

  rejectRequest(
    requestId: string,
    admin: AuthenticatedUser,
    dto: RejectLoanRequestDto,
  ): Promise<LoanRequestResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.findPendingRequest(manager, requestId);
      request.status = LoanRequestStatus.REJECTED;
      request.adminNote = dto.adminNote ?? null;
      request.reviewedBy = admin.userId;
      request.reviewedAt = new Date();
      return toLoanRequestResponse(
        await manager.getRepository(LoanRequest).save(request),
      );
    });
  }

  confirmInstallmentPayment(
    installmentId: string,
    admin: AuthenticatedUser,
    dto?: ConfirmInstallmentPaymentDto,
  ): Promise<ConfirmInstallmentPaymentResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const installment = await manager
        .getRepository(Installment)
        .createQueryBuilder('installment')
        .where('installment.id = :installmentId', { installmentId })
        .setLock('pessimistic_write')
        .getOne();
      if (!installment) {
        throw new NotFoundException('قسط موردنظر پیدا نشد.');
      }
      if (installment.status === InstallmentStatus.PAID) {
        throw new ConflictException('این قسط قبلاً پرداخت شده است.');
      }

      const loan = await manager
        .getRepository(Loan)
        .createQueryBuilder('loan')
        .innerJoinAndSelect('loan.user', 'user')
        .where('loan.id = :loanId', { loanId: installment.loanId })
        .setLock('pessimistic_write')
        .getOne();
      if (!loan) {
        throw new NotFoundException('وام مربوط به قسط پیدا نشد.');
      }

      installment.status = InstallmentStatus.PAID;
      installment.loan = loan;
      installment.paidAt = dto?.paidAt ? new Date(dto.paidAt) : new Date();
      installment.paidConfirmedBy = admin.userId;
      await manager.getRepository(Installment).save(installment);

      const unpaidCount = await manager
        .getRepository(Installment)
        .createQueryBuilder('installment')
        .where('installment.loanId = :loanId', { loanId: loan.id })
        .andWhere('installment.status <> :paid', {
          paid: InstallmentStatus.PAID,
        })
        .getCount();
      loan.status =
        unpaidCount === 0 ? LoanStatus.COMPLETED : LoanStatus.ACTIVE;
      await manager.getRepository(Loan).save(loan);

      return {
        ...this.toAdminInstallmentResponse(installment, utcToday()),
        loanStatus: loan.status,
        remainingBalance: loan.remainingBalance,
      };
    });
  }

  private async findPendingRequest(
    manager: EntityManager,
    requestId: string,
  ): Promise<LoanRequest> {
    const request = await manager.getRepository(LoanRequest).findOne({
      where: { id: requestId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!request) {
      throw new NotFoundException('درخواست وام یافت نشد.');
    }
    if (request.status !== LoanRequestStatus.PENDING) {
      throw new ConflictException('این درخواست قبلاً بررسی شده است.');
    }
    if (!request.userId) {
      throw new BadRequestException('اطلاعات کاربر درخواست معتبر نیست.');
    }
    return request;
  }
}
