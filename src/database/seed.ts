import 'reflect-metadata';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database.config';
import { Installment } from '../loans/entities/installment.entity';
import { Loan } from '../loans/entities/loan.entity';
import { LoanRequest } from '../loans/entities/loan-request.entity';
import {
  InstallmentStatus,
  LoanRequestStatus,
  LoanStatus,
} from '../loans/loan.enums';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationType } from '../notifications/notification.enums';
import { Shop } from '../shops/entities/shop.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionStatus } from '../transactions/transaction.enums';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/user-role.enum';

const ids = {
  admin: '10000000-0000-4000-8000-000000000001',
  user: '10000000-0000-4000-8000-000000000002',
  request: '20000000-0000-4000-8000-000000000001',
  loan: '30000000-0000-4000-8000-000000000001',
  shop: '40000000-0000-4000-8000-000000000001',
  firstInstallment: '50000000-0000-4000-8000-000000000001',
  secondInstallment: '50000000-0000-4000-8000-000000000002',
  thirdInstallment: '50000000-0000-4000-8000-000000000003',
  transaction: '60000000-0000-4000-8000-000000000001',
  notification: '70000000-0000-4000-8000-000000000001',
} as const;

async function seed(): Promise<void> {
  const dataSource = new DataSource(buildDatabaseOptions());
  await dataSource.initialize();

  try {
    const password = await hash('Password123!', 12);
    const now = new Date();

    await dataSource.transaction(async (manager) => {
      await manager.upsert(
        User,
        [
          {
            id: ids.admin,
            fullName: 'مدیر سیستم',
            nationalCode: '0012345678',
            phone: '09120000001',
            email: 'admin@example.com',
            password,
            role: UserRole.ADMIN,
            isActive: true,
            refreshTokenHash: null,
          },
          {
            id: ids.user,
            fullName: 'کاربر نمونه',
            nationalCode: '0012345679',
            phone: '09120000002',
            email: 'user@example.com',
            password,
            role: UserRole.USER,
            isActive: true,
            refreshTokenHash: null,
          },
        ],
        ['id'],
      );

      await manager.upsert(
        Shop,
        [
          {
            id: ids.shop,
            name: 'فروشگاه نمونه',
            ownerName: 'صاحب فروشگاه',
            phone: '09120000003',
            address: 'تهران، خیابان نمونه، پلاک ۱',
            description: 'فروشگاه نمونه برای تست پرداخت با QR',
            qrCodeToken: 'seed-shop-qr-token-40000000-0000-4000-8000',
            isActive: true,
            deletedAt: null,
          },
        ],
        ['id'],
      );

      await manager.upsert(
        LoanRequest,
        [
          {
            id: ids.request,
            userId: ids.user,
            requestedAmount: '30000000',
            purpose: 'خرید لوازم ضروری منزل',
            status: LoanRequestStatus.APPROVED,
            adminNote: 'درخواست تایید شد.',
            reviewedBy: ids.admin,
            reviewedAt: new Date('2026-09-20T10:00:00.000Z'),
          },
        ],
        ['id'],
      );

      await manager.upsert(
        Loan,
        [
          {
            id: ids.loan,
            userId: ids.user,
            loanRequestId: ids.request,
            principalAmount: '30000000',
            interestRate: '10',
            totalAmount: '33000000',
            installmentCount: 3,
            installmentAmount: '11000000',
            startDate: '2026-09-25',
            status: LoanStatus.ACTIVE,
            remainingBalance: '22000000',
          },
        ],
        ['id'],
      );

      await manager.upsert(
        Installment,
        [
          {
            id: ids.firstInstallment,
            loanId: ids.loan,
            installmentNumber: 1,
            dueDate: '2026-10-01',
            amount: '11000000',
            status: InstallmentStatus.PAID,
            paidAt: new Date('2026-10-01T12:00:00.000Z'),
            paidConfirmedBy: ids.admin,
          },
          {
            id: ids.secondInstallment,
            loanId: ids.loan,
            installmentNumber: 2,
            dueDate: '2026-10-05',
            amount: '11000000',
            status: InstallmentStatus.OVERDUE,
            paidAt: null,
            paidConfirmedBy: null,
          },
          {
            id: ids.thirdInstallment,
            loanId: ids.loan,
            installmentNumber: 3,
            dueDate: '2026-11-01',
            amount: '11000000',
            status: InstallmentStatus.PENDING,
            paidAt: null,
            paidConfirmedBy: null,
          },
        ],
        ['id'],
      );

      await manager.upsert(
        Transaction,
        [
          {
            id: ids.transaction,
            userId: ids.user,
            loanId: ids.loan,
            shopId: ids.shop,
            amount: '5000000.00',
            description: 'خرید نمونه از فروشگاه',
            status: TransactionStatus.COMPLETED,
          },
        ],
        ['id'],
      );

      await manager.upsert(
        Notification,
        [
          {
            id: ids.notification,
            userId: ids.user,
            installmentId: ids.secondInstallment,
            type: NotificationType.INSTALLMENT_OVERDUE,
            title: 'قسط معوقه',
            message: 'قسط دوم وام شما سررسید شده و پرداخت نشده است.',
            isRead: false,
          },
        ],
        ['id'],
      );

      await manager
        .createQueryBuilder()
        .update(User)
        .set({ updatedAt: now })
        .where('id IN (:...ids)', { ids: [ids.admin, ids.user] })
        .execute();
    });

    console.log('Database seed completed successfully.');
    console.log('Demo credentials: admin@example.com / Password123!');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('Database seed failed.', error);
  process.exitCode = 1;
});
