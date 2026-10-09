import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LoanStatus } from '../loan.enums';
import { LoanRequest } from './loan-request.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity('loans')
@Index('UQ_loans_loan_request_id', ['loanRequestId'], { unique: true })
@Index('IDX_loans_user_id', ['userId'])
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.loans, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  loanRequestId!: string;

  @OneToOne(() => LoanRequest, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loanRequestId' })
  loanRequest!: LoanRequest;

  @Column({ type: 'numeric' })
  principalAmount!: string;

  @Column({ type: 'numeric' })
  interestRate!: string;

  @Column({ type: 'numeric' })
  totalAmount!: string;

  @Column({ type: 'integer' })
  installmentCount!: number;

  @Column({ type: 'numeric' })
  installmentAmount!: string;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    enumName: 'loans_status_enum',
    default: LoanStatus.ACTIVE,
  })
  status!: LoanStatus;

  @Column({ type: 'numeric' })
  remainingBalance!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.loan)
  transactions?: Transaction[];
}
