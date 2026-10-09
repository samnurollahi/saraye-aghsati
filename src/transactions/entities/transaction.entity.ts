import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Loan } from '../../loans/entities/loan.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { TransactionStatus } from '../transaction.enums';

@Entity('transactions')
@Index('IDX_transactions_user_created_at', ['userId', 'createdAt'])
@Index('IDX_transactions_loan_id', ['loanId'])
@Index('IDX_transactions_shop_id', ['shopId'])
@Index('IDX_transactions_status', ['status'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  loanId!: string;

  @ManyToOne(() => Loan, (loan) => loan.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loanId' })
  loan!: Loan;

  @Column({ type: 'uuid' })
  shopId!: string;

  @ManyToOne(() => Shop, (shop) => shop.transactions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'shopId' })
  shop!: Shop;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    enumName: 'transactions_status_enum',
    default: TransactionStatus.COMPLETED,
  })
  status!: TransactionStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
