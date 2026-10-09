import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LoanRequestStatus } from '../loan.enums';

@Entity('loan_requests')
@Index('IDX_loan_requests_user_id', ['userId'])
@Index('IDX_loan_requests_status', ['status'])
export class LoanRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.loanRequests, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'numeric' })
  requestedAmount!: string;

  @Column({ type: 'text' })
  purpose!: string;

  @Column({
    type: 'enum',
    enum: LoanRequestStatus,
    enumName: 'loan_requests_status_enum',
    default: LoanRequestStatus.PENDING,
  })
  status!: LoanRequestStatus;

  @Column({ type: 'text', nullable: true })
  adminNote!: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @ManyToOne(() => User, (user) => user.reviewedLoanRequests, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer!: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
