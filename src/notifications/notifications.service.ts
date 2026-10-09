import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Installment } from '../loans/entities/installment.entity';
import { InstallmentStatus } from '../loans/loan.enums';
import { NotificationPaginationDto } from './dto/notification-pagination.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './notification.enums';

interface InstallmentNotificationTarget {
  installmentId: string;
  installmentNumber: number;
  dueDate: string;
  status: InstallmentStatus;
  userId: string;
}

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return utcDateString(result);
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(Installment)
    private readonly installmentsRepository: Repository<Installment>,
  ) {}

  async list(
    user: AuthenticatedUser,
    pagination: NotificationPaginationDto,
  ): Promise<{
    items: NotificationResponseDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const [notifications, total] =
      await this.notificationsRepository.findAndCount({
        where: { userId: user.userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    return {
      items: notifications.map((notification) => this.toResponse(notification)),
      page,
      limit,
      total,
    };
  }

  async markAsRead(
    notificationId: string,
    user: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, userId: user.userId },
    });
    if (!notification) {
      throw new NotFoundException('اعلان موردنظر پیدا نشد.');
    }
    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationsRepository.save(notification);
    }
    return this.toResponse(notification);
  }

  @Cron('0 8 * * *', { timeZone: 'UTC' })
  async scheduleInstallmentNotifications(): Promise<number> {
    return this.createInstallmentNotifications();
  }

  async createInstallmentNotifications(now = new Date()): Promise<number> {
    const today = utcDateString(now);
    const dueSoonCutoff = addUtcDays(now, 3);
    const targets = await this.installmentsRepository
      .createQueryBuilder('installment')
      .innerJoin('installment.loan', 'loan')
      .select('installment.id', 'installmentId')
      .addSelect('installment.installmentNumber', 'installmentNumber')
      .addSelect('installment.dueDate', 'dueDate')
      .addSelect('installment.status', 'status')
      .addSelect('loan.userId', 'userId')
      .where('installment.status IN (:...statuses)', {
        statuses: [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE],
      })
      .andWhere('installment.dueDate <= :dueSoonCutoff', { dueSoonCutoff })
      .getRawMany<InstallmentNotificationTarget>();

    const notifications: Partial<Notification>[] = [];
    for (const installment of targets) {
      const installmentNumber = installment.installmentNumber;
      const base = {
        userId: installment.userId,
        installmentId: installment.installmentId,
        isRead: false,
      };
      if (
        installment.status === InstallmentStatus.OVERDUE ||
        installment.dueDate < today
      ) {
        notifications.push({
          ...base,
          type: NotificationType.INSTALLMENT_OVERDUE,
          title: 'قسط معوق شده است',
          message: `موعد پرداخت قسط شماره ${installmentNumber} شما گذشته است.`,
        });
      } else if (installment.dueDate === today) {
        notifications.push({
          ...base,
          type: NotificationType.INSTALLMENT_DUE,
          title: 'سررسید قسط',
          message: `قسط شماره ${installmentNumber} شما امروز سررسید شده است.`,
        });
      } else {
        notifications.push({
          ...base,
          type: NotificationType.INSTALLMENT_DUE_SOON,
          title: 'سررسید قسط نزدیک است',
          message: `قسط شماره ${installmentNumber} شما نزدیک به سررسید است.`,
        });
      }
    }

    if (notifications.length === 0) return 0;
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .insert()
      .into(Notification)
      .values(notifications)
      .orIgnore()
      .execute();
    return result.identifiers.length;
  }

  private toResponse(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      installmentId: notification.installmentId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}
