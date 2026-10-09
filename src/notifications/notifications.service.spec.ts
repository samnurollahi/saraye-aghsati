import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Installment } from '../loans/entities/installment.entity';
import { InstallmentStatus } from '../loans/loan.enums';
import { UserRole } from '../users/user-role.enum';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './notification.enums';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const user: AuthenticatedUser = { userId: 'user-a', role: UserRole.USER };
  const targets = [
    {
      installmentId: 'installment-soon',
      installmentNumber: 3,
      dueDate: '2026-10-10',
      status: InstallmentStatus.PENDING,
      userId: user.userId,
    },
    {
      installmentId: 'installment-due',
      installmentNumber: 4,
      dueDate: '2026-10-08',
      status: InstallmentStatus.PENDING,
      userId: user.userId,
    },
    {
      installmentId: 'installment-late',
      installmentNumber: 5,
      dueDate: '2026-10-07',
      status: InstallmentStatus.PENDING,
      userId: user.userId,
    },
  ];
  let service: NotificationsService;
  let notificationsRepository: Record<string, jest.Mock>;
  let installmentsRepository: Record<string, jest.Mock>;
  let values: Partial<Notification>[];
  let inserted: Set<string>;
  let insertBuilder: Record<string, jest.Mock>;
  let installmentsQueryBuilder: Record<string, jest.Mock>;

  beforeEach(() => {
    values = [];
    inserted = new Set();
    insertBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn((entries: Partial<Notification>[]) => {
        values = entries;
        return insertBuilder;
      }),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn(() => {
        const identifiers: object[] = [];
        for (const entry of values) {
          const key = `${entry.installmentId}:${entry.type}`;
          if (!inserted.has(key)) {
            inserted.add(key);
            identifiers.push({ id: key });
          }
        }
        return { identifiers };
      }),
    };
    installmentsQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(() => targets),
    };
    notificationsRepository = {
      findAndCount: jest.fn(() => [[], 0]),
      findOne: jest.fn(() => null),
      save: jest.fn((notification: Notification) => notification),
      createQueryBuilder: jest.fn(() => insertBuilder),
    };
    installmentsRepository = {
      createQueryBuilder: jest.fn(() => installmentsQueryBuilder),
    };
    service = new NotificationsService(
      notificationsRepository as unknown as Repository<Notification>,
      installmentsRepository as unknown as Repository<Installment>,
    );
  });

  it('creates due-soon, due-today, and overdue notifications using UTC dates', async () => {
    const created = await service.createInstallmentNotifications(
      new Date('2026-10-08T00:30:00.000Z'),
    );

    expect(created).toBe(3);
    expect(values.map(({ type }) => type)).toEqual([
      NotificationType.INSTALLMENT_DUE_SOON,
      NotificationType.INSTALLMENT_DUE,
      NotificationType.INSTALLMENT_OVERDUE,
    ]);
    expect(values.map(({ message }) => message)).toEqual([
      'قسط شماره 3 شما نزدیک به سررسید است.',
      'قسط شماره 4 شما امروز سررسید شده است.',
      'موعد پرداخت قسط شماره 5 شما گذشته است.',
    ]);
    expect(installmentsQueryBuilder.andWhere).toHaveBeenCalledWith(
      'installment.dueDate <= :dueSoonCutoff',
      { dueSoonCutoff: '2026-10-11' },
    );
  });

  it('does not duplicate a notification when the daily job runs again', async () => {
    const now = new Date('2026-10-08T08:00:00.000Z');

    await service.createInstallmentNotifications(now);
    const nextExecution = await service.createInstallmentNotifications(now);

    expect(nextExecution).toBe(0);
    expect(insertBuilder.orIgnore).toHaveBeenCalledTimes(2);
    expect(inserted.size).toBe(3);
  });

  it('lists only the authenticated user notifications with pagination', async () => {
    await service.list(user, { page: 2, limit: 5 });

    expect(notificationsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: user.userId },
        skip: 5,
        take: 5,
      }),
    );
  });

  it('does not allow a user to mark another user notification as read', async () => {
    await expect(
      service.markAsRead('other-notification', user),
    ).rejects.toThrow(new NotFoundException('اعلان موردنظر پیدا نشد.'));
    expect(notificationsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'other-notification', userId: user.userId },
    });
    expect(notificationsRepository.save).not.toHaveBeenCalled();
  });
});
