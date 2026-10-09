import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InstallmentStatus,
  LoanRequestStatus,
  LoanStatus,
} from '../loan.enums';

export class LoanRequestResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: String, example: '100000000.00' })
  requestedAmount!: string;

  @ApiProperty()
  purpose!: string;

  @ApiProperty({ enum: LoanRequestStatus })
  status!: LoanRequestStatus;

  @ApiProperty({ nullable: true })
  adminNote!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class LoanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  loanRequestId!: string;

  @ApiProperty({ type: String, example: '100000000.00' })
  principalAmount!: string;

  @ApiProperty({ type: String, example: '18' })
  interestRate!: string;

  @ApiProperty({ type: String, example: '118000000.00' })
  totalAmount!: string;

  @ApiProperty()
  installmentCount!: number;

  @ApiProperty({ type: String, example: '9833333.33' })
  installmentAmount!: string;

  @ApiProperty({ type: String, format: 'date' })
  startDate!: string;

  @ApiProperty({ enum: LoanStatus })
  status!: LoanStatus;

  @ApiProperty({
    type: String,
    example: '118000000.00',
    description: 'اعتبار باقی‌مانده قابل‌مصرف برای خرید؛ مانده بدهی اقساط نیست.',
  })
  remainingBalance!: string;
}

export class InstallmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  loanId!: string;

  @ApiProperty()
  installmentNumber!: number;

  @ApiProperty({ type: String, format: 'date' })
  dueDate!: string;

  @ApiProperty({ type: String, example: '9833333.33' })
  amount!: string;

  @ApiProperty({ enum: InstallmentStatus })
  status!: InstallmentStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  paidAt!: Date | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  paidConfirmedBy!: string | null;
}

export class LoanApprovalResponseDto {
  @ApiProperty({ type: () => LoanRequestResponseDto })
  loanRequest!: LoanRequestResponseDto;

  @ApiProperty({ type: () => LoanResponseDto })
  loan!: LoanResponseDto;

  @ApiProperty({ type: () => InstallmentResponseDto, isArray: true })
  installments!: InstallmentResponseDto[];
}

export class MyLoanRequestResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, example: '100000000.00' })
  requestedAmount!: string;

  @ApiProperty()
  purpose!: string;

  @ApiProperty({ enum: LoanRequestStatus })
  status!: LoanRequestStatus;

  @ApiProperty({ nullable: true })
  adminNote!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class MyLoanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, example: '100000000.00' })
  principalAmount!: string;

  @ApiProperty({ type: String, example: '18' })
  interestRate!: string;

  @ApiProperty({ type: String, example: '118000000.00' })
  totalAmount!: string;

  @ApiProperty()
  installmentCount!: number;

  @ApiProperty({ type: String, example: '9833333.33' })
  installmentAmount!: string;

  @ApiProperty({ type: String, format: 'date' })
  startDate!: string;

  @ApiProperty({ enum: LoanStatus })
  status!: LoanStatus;

  @ApiProperty({
    type: String,
    example: '118000000.00',
    description: 'اعتبار باقی‌مانده قابل‌مصرف برای خرید؛ مانده بدهی اقساط نیست.',
  })
  remainingBalance!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class MyInstallmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  installmentNumber!: number;

  @ApiProperty({ type: String, format: 'date' })
  dueDate!: string;

  @ApiProperty({ type: String, example: '9833333.33' })
  amount!: string;

  @ApiProperty({ enum: InstallmentStatus })
  status!: InstallmentStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  paidAt!: Date | null;
}

export class AdminUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  nationalCode!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ nullable: true })
  email!: string | null;
}

export class AdminLoanRequestResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: () => AdminUserSummaryDto })
  user!: AdminUserSummaryDto;

  @ApiProperty({ type: String, example: '100000000.00' })
  requestedAmount!: string;

  @ApiProperty()
  purpose!: string;

  @ApiProperty({ enum: LoanRequestStatus })
  status!: LoanRequestStatus;

  @ApiProperty({ nullable: true })
  adminNote!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiPropertyOptional({ type: () => LoanResponseDto })
  loan?: LoanResponseDto;
}

export class AdminLoanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: () => AdminUserSummaryDto })
  user!: AdminUserSummaryDto;

  @ApiProperty({ format: 'uuid' })
  loanRequestId!: string;

  @ApiProperty({ type: String, example: '100000000.00' })
  principalAmount!: string;

  @ApiProperty({ type: String, example: '18' })
  interestRate!: string;

  @ApiProperty({ type: String, example: '118000000.00' })
  totalAmount!: string;

  @ApiProperty()
  installmentCount!: number;

  @ApiProperty({ type: String, example: '9833333.33' })
  installmentAmount!: string;

  @ApiProperty({ type: String, format: 'date' })
  startDate!: string;

  @ApiProperty({ enum: LoanStatus })
  status!: LoanStatus;

  @ApiProperty({
    type: String,
    example: '118000000.00',
    description: 'اعتبار باقی‌مانده قابل‌مصرف برای خرید؛ مانده بدهی اقساط نیست.',
  })
  remainingBalance!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: () => MyInstallmentResponseDto, isArray: true })
  installments?: MyInstallmentResponseDto[];
}

export class AdminUserResponseDto extends AdminUserSummaryDto {
  @ApiProperty({ enum: ['user', 'admin'] })
  role!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AdminInstallmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  loanId!: string;

  @ApiProperty({ type: () => AdminUserSummaryDto })
  user!: AdminUserSummaryDto;

  @ApiProperty()
  installmentNumber!: number;

  @ApiProperty({ format: 'date' })
  dueDate!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: InstallmentStatus })
  status!: InstallmentStatus;

  @ApiProperty({ nullable: true, format: 'date-time' })
  paidAt!: Date | null;

  @ApiProperty({ nullable: true, format: 'uuid' })
  paidConfirmedBy!: string | null;
}

export class PaginatedAdminInstallmentResponseDto {
  @ApiProperty({ type: AdminInstallmentResponseDto, isArray: true })
  items!: AdminInstallmentResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class ConfirmInstallmentPaymentResponseDto extends AdminInstallmentResponseDto {
  @ApiProperty({ enum: LoanStatus })
  loanStatus!: LoanStatus;

  @ApiProperty({
    description: 'اعتبار قابل‌مصرف وام؛ با تأیید قسط تغییر نمی‌کند.',
  })
  remainingBalance!: string;
}
