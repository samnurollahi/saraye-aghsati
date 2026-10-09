import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
  let app: INestApplication<App>;
  const transactionsService = {
    create: jest.fn().mockResolvedValue({
      id: 'transaction-id',
      shop: { id: 'shop-id', name: 'فروشگاه' },
      amount: '50000000.00',
      description: null,
      status: 'completed',
      createdAt: new Date('2026-10-08T12:00:00.000Z'),
      loan: { id: 'loan-id', status: 'active', remainingBalance: '10.00' },
    }),
    getMyTransactions: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    }),
  };

  beforeEach(async () => {
    const jwtService = {
      verifyAsync: jest.fn((token: string) => {
        if (token === 'user-token') {
          return Promise.resolve({
            sub: 'user-a',
            role: UserRole.USER,
            tokenUse: 'access',
          });
        }
        if (token === 'admin-token') {
          return Promise.resolve({
            sub: 'admin-a',
            role: UserRole.ADMIN,
            tokenUse: 'access',
          });
        }
        throw new Error('Invalid token');
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        { provide: TransactionsService, useValue: transactionsService },
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
                ([, message]) => message,
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

  it('requires a valid JWT and rejects admin role for user consumption APIs', async () => {
    await request(app.getHttpServer())
      .post('/transactions')
      .send({ shopId: 'shop-id', amount: 100 })
      .expect(401);
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', 'Bearer invalid-token')
      .send({ shopId: 'shop-id', amount: 100 })
      .expect(401);
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', 'Bearer admin-token')
      .send({ shopId: 'shop-id', amount: 100 })
      .expect(403);
  });

  it('rejects userId and loanId from the request body', async () => {
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', 'Bearer user-token')
      .send({
        shopId: '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb',
        amount: 100,
        userId: 'user-b',
        loanId: 'loan-b',
      })
      .expect(400);
    expect(transactionsService.create).not.toHaveBeenCalled();
  });

  it('uses JWT identity for creation and listing', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', 'Bearer user-token')
      .send({
        shopId: '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb',
        amount: 50000000,
      })
      .expect(201);
    expect(
      (response.body as { loan: { remainingBalance: string } }).loan
        .remainingBalance,
    ).toBe('10.00');
    expect(transactionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-a', role: UserRole.USER }),
      expect.objectContaining({ amount: '50000000' }),
    );

    await request(app.getHttpServer())
      .get('/transactions/me?page=2&limit=5')
      .set('Authorization', 'Bearer user-token')
      .expect(200);
    expect(transactionsService.getMyTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-a' }),
      expect.objectContaining({ page: 2, limit: 5 }),
    );
  });

  it('rejects zero and negative amounts at the HTTP boundary', async () => {
    for (const amount of [0, -10]) {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', 'Bearer user-token')
        .send({ shopId: '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb', amount })
        .expect(400);
    }
    expect(transactionsService.create).not.toHaveBeenCalled();
  });
});
