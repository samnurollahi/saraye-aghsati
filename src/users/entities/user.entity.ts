import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../user-role.enum';
import { Loan } from '../../loans/entities/loan.entity';
import { LoanRequest } from '../../loans/entities/loan-request.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity('users')
@Index('UQ_users_national_code', ['nationalCode'], { unique: true })
@Index('UQ_users_phone', ['phone'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 10 })
  nationalCode: string;

  @Column({ type: 'varchar', length: 11 })
  phone: string;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'users_role_enum',
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  refreshTokenHash: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => LoanRequest, (loanRequest) => loanRequest.user)
  loanRequests?: LoanRequest[];

  @OneToMany(() => LoanRequest, (loanRequest) => loanRequest.reviewer)
  reviewedLoanRequests?: LoanRequest[];

  @OneToMany(() => Loan, (loan) => loan.user)
  loans?: Loan[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions?: Transaction[];
}
