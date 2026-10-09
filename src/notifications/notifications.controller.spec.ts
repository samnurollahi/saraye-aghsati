import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let app: INestApplication<App>;
  const notificationsService = {
    list: jest
      .fn()
      .mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 }),
    markAsRead: jest
      .fn()
      .mockResolvedValue({ id: 'notification-id', isRead: true }),
  };

  beforeEach(async () => {
    const jwtService = {
      verifyAsync: jest.fn((token: string) => {
        if (token === 'user-token') {
          return Promise.resolve({
            sub: 'user-id',
            role: UserRole.USER,
            tokenUse: 'access',
          });
        }
        if (token === 'admin-token') {
          return Promise.resolve({
            sub: 'admin-id',
            role: UserRole.ADMIN,
            tokenUse: 'access',
          });
        }
        throw new Error('Invalid token');
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        { provide: NotificationsService, useValue: notificationsService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('access-secret') },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) =>
          new BadRequestException(
            errors.flatMap((error) =>
              Object.entries(error.constraints ?? {}).map(
                ([constraint, message]) =>
                  constraint === 'whitelistValidation'
                    ? `فیلد ${error.property} مجاز نیست.`
                    : message,
              ),
            ),
          ),
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('requires JWT and limits notification access to user role', async () => {
    await request(app.getHttpServer()).get('/notifications').expect(401);
    await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', 'Bearer admin-token')
      .expect(403);
    expect(notificationsService.list).not.toHaveBeenCalled();
  });

  it('returns only the current user notification list and forwards pagination', async () => {
    await request(app.getHttpServer())
      .get('/notifications?page=3&limit=4')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(notificationsService.list).toHaveBeenCalledWith(
      { principalType: 'user', userId: 'user-id', role: UserRole.USER },
      { page: 3, limit: 4 },
    );
  });

  it('marks a notification read under the current user identity', async () => {
    const notificationId = '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb';
    await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(notificationsService.markAsRead).toHaveBeenCalledWith(
      notificationId,
      { principalType: 'user', userId: 'user-id', role: UserRole.USER },
    );

    notificationsService.markAsRead.mockRejectedValueOnce(
      new NotFoundException('اعلان موردنظر پیدا نشد.'),
    );
    await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', 'Bearer user-token')
      .expect(404);
  });

  it('documents user notification endpoints in Swagger', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(Object.keys(document.paths).sort()).toEqual([
      '/notifications',
      '/notifications/{id}/read',
    ]);
    expect(document.paths['/notifications']?.get?.security).toEqual([
      { bearer: [] },
    ]);
    expect(
      document.components?.schemas?.PaginatedNotificationResponseDto,
    ).toBeDefined();
  });
});
