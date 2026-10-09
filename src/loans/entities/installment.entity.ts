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
import { InstallmentStatus } from '../loan.enums';
import { Loan } from './loan.entity';

@Entity('installments')
@Index('UQ_installments_loan_number', ['loanId', 'installmentNumber'], {
  unique: true,
})
export class Installment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  loanId!: string;

  @ManyToOne(() => Loan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loanId' })
  loan!: Loan;

  @Column({ type: 'integer' })
  installmentNumber!: number;

  @Column({ type: 'date' })
  dueDate!: string;

  @Column({ type: 'numeric' })
  amount!: string;

  @Column({
    type: 'enum',
    enum: InstallmentStatus,
    enumName: 'installments_status_enum',
    default: InstallmentStatus.PENDING,
  })
  status!: InstallmentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  paidConfirmedBy!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paidConfirmedBy' })
  paymentConfirmer!: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
