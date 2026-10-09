import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Shop } from './shop.entity';

@Entity('shop_accounts')
@Index('UQ_shop_accounts_shop_id', ['shopId'], { unique: true })
@Index('UQ_shop_accounts_login_phone', ['loginPhone'], { unique: true })
@Index('UQ_shop_accounts_setup_token_hash', ['setupTokenHash'], {
  unique: true,
})
export class ShopAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  shopId!: string;

  @OneToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop!: Shop;

  @Column({ type: 'varchar', length: 11 })
  loginPhone!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  refreshTokenHash!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  setupTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  setupTokenExpiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
