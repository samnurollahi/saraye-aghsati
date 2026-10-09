import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserRole } from '../users/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

describe('LoansController', () => {
  let app: INestApplication<App>;
  const loansService = {
    createRequest: jest.fn().mockResolvedValue({ id: 'request-id' }),
    getMyRequests: jest.fn().mockResolvedValue([]),
    getMyLoans: jest.fn().mockResolvedValue([]),
    getMyInstallments: jest.fn().mockResolvedValue([]),
    getAdminRequests: jest.fn().mockResolvedValue([]),
    getAdminRequest: jest.fn().mockResolvedValue({ id: 'request-id' }),
    getAdminLoans: jest.fn().mockResolvedValue([]),
    getAdminLoan: jest.fn().mockResolvedValue({ id: 'loan-id' }),
    getAdminUsers: jest.fn().mockResolvedValue([]),
    getAdminInstallments: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    }),
    confirmInstallmentPayment: jest
      .fn()
      .mockResolvedValue({ id: 'installment-id' }),
    approveRequest: jest.fn().mockResolvedValue({ loan: { id: 'loan-id' } }),
    rejectRequest: jest.fn().mockResolvedValue({ id: 'request-id' }),
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
      controllers: [LoansController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        { provide: LoansService, useValue: loansService },
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

  it('requires authentication to create a loan request', async () => {
    await request(app.getHttpServer())
      .post('/loan-requests')
      .send({ requestedAmount: 100, purpose: 'خرید کالا' })
      .expect(401);
  });

  it('creates requests as the JWT user and rejects a body-supplied userId', async () => {
    await request(app.getHttpServer())
      .post('/loan-requests')
      .set('Authorization', 'Bearer user-token')
      .send({ requestedAmount: 100, purpose: 'خرید کالا' })
      .expect(201);
    expect(loansService.createRequest).toHaveBeenCalledWith(
      { userId: 'user-id', role: UserRole.USER },
      { requestedAmount: 100, purpose: 'خرید کالا' },
    );

    await request(app.getHttpServer())
      .post('/loan-requests')
      .set('Authorization', 'Bearer user-token')
      .send({
        requestedAmount: 100,
        purpose: 'خرید کالا',
        userId: 'other-user',
      })
      .expect(400)
      .then((response) => {
        expect(response.body.message).toContain('فیلد userId مجاز نیست.');
      });
  });

  it('rejects invalid request and approval DTO values in Persian', async () => {
    await request(app.getHttpServer())
      .post('/loan-requests')
      .set('Authorization', 'Bearer user-token')
      .send({ requestedAmount: 0, purpose: '' })
      .expect(400)
      .then((response) => {
        expect(response.body.message).toContain(
          'مبلغ درخواست باید بیشتر از صفر باشد.',
        );
        expect(response.body.message).toContain('توضیحات درخواست الزامی است.');
      });

    await request(app.getHttpServer())
      .patch(
        '/admin/loan-requests/6b2d98f2-82e8-4ac5-8f32-646888a4f3bb/approve',
      )
      .set('Authorization', 'Bearer admin-token')
      .send({
        principalAmount: 0,
        interestRate: -1,
        installmentCount: 0,
        startDate: 'not-a-date',
      })
      .expect(400)
      .then((response) => {
        expect(response.body.message).toContain('مبلغ وام معتبر نیست.');
        expect(response.body.message).toContain(
          'درصد سود نمی‌تواند منفی باشد.',
        );
        expect(response.body.message).toContain('تعداد اقساط معتبر نیست.');
        expect(response.body.message).toContain('تاریخ شروع معتبر نیست.');
      });
  });

  it('prevents a regular user from approving a loan request', async () => {
    await request(app.getHttpServer())
      .patch(
        '/admin/loan-requests/6b2d98f2-82e8-4ac5-8f32-646888a4f3bb/approve',
      )
      .set('Authorization', 'Bearer user-token')
      .send({
        principalAmount: 100,
        interestRate: 10,
        installmentCount: 2,
        startDate: '2026-10-10',
      })
      .expect(403);
    expect(loansService.approveRequest).not.toHaveBeenCalled();
  });

  it('limits user read endpoints to the authenticated user role', async () => {
    await request(app.getHttpServer())
      .get('/loan-requests/me')
      .set('Authorization', 'Bearer user-token')
      .expect(200);
    expect(loansService.getMyRequests).toHaveBeenCalledWith({
      userId: 'user-id',
      role: UserRole.USER,
    });

    await request(app.getHttpServer())
      .get('/loans/me')
      .set('Authorization', 'Bearer user-token')
      .expect(200);
    expect(loansService.getMyLoans).toHaveBeenCalledWith({
      userId: 'user-id',
      role: UserRole.USER,
    });

    await request(app.getHttpServer())
      .get('/loans/6b2d98f2-82e8-4ac5-8f32-646888a4f3bb/installments')
      .set('Authorization', 'Bearer user-token')
      .expect(200);
    expect(loansService.getMyInstallments).toHaveBeenCalledWith(
      '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb',
      { userId: 'user-id', role: UserRole.USER },
    );
  });

  it('protects admin read endpoints and validates request status filters', async () => {
    await request(app.getHttpServer())
      .get('/admin/loan-requests')
      .set('Authorization', 'Bearer user-token')
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/loans')
      .set('Authorization', 'Bearer user-token')
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', 'Bearer user-token')
      .expect(403);

    await request(app.getHttpServer())
      .get('/admin/loan-requests?status=invalid')
      .set('Authorization', 'Bearer admin-token')
      .expect(400)
      .then((response) => {
        expect(response.body.message).toContain('وضعیت درخواست معتبر نیست.');
      });

    await request(app.getHttpServer())
      .get('/admin/loan-requests?status=pending')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    expect(loansService.getAdminRequests).toHaveBeenCalledWith({
      status: 'pending',
    });

    await request(app.getHttpServer())
      .get('/admin/loan-requests/6b2d98f2-82e8-4ac5-8f32-646888a4f3bb')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    await request(app.getHttpServer())
      .get('/admin/loans/6b2d98f2-82e8-4ac5-8f32-646888a4f3bb')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    await request(app.getHttpServer())
      .get('/admin/loans')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
  });

  it('allows an admin to approve and rejects a regular user from rejecting', async () => {
    await request(app.getHttpServer())
      .patch(
        '/admin/loan-requests/6b2d98f2-82e8-4ac5-8f32-646888a4f3bb/approve',
      )
      .set('Authorization', 'Bearer admin-token')
      .send({
        principalAmount: 100,
        interestRate: 10,
        installmentCount: 2,
        startDate: '2026-10-10',
      })
      .expect(200);
    expect(loansService.approveRequest).toHaveBeenCalledWith(
      '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb',
      { userId: 'admin-id', role: UserRole.ADMIN },
      {
        principalAmount: 100,
        interestRate: 10,
        installmentCount: 2,
        startDate: '2026-10-10',
      },
    );

    await request(app.getHttpServer())
      .patch('/admin/loan-requests/6b2d98f2-82e8-4ac5-8f32-646888a4f3bb/reject')
      .set('Authorization', 'Bearer user-token')
      .send({ adminNote: 'رد' })
      .expect(403);
    expect(loansService.rejectRequest).not.toHaveBeenCalled();
  });

  it('protects installment administration and requires the admin role to confirm payment', async () => {
    const installmentId = '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb';
    await request(app.getHttpServer()).get('/admin/installments').expect(401);
    await request(app.getHttpServer())
      .get(
        '/admin/installments?status=pending&dueBefore=2026-10-08&page=2&limit=5',
      )
      .set('Authorization', 'Bearer user-token')
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/admin/installments/${installmentId}/confirm-payment`)
      .set('Authorization', 'Bearer user-token')
      .send({ paidAt: '2026-10-08T12:30:00.000Z' })
      .expect(403);
    expect(loansService.confirmInstallmentPayment).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .get(
        '/admin/installments?status=pending&dueBefore=2026-10-08&page=2&limit=5',
      )
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    expect(loansService.getAdminInstallments).toHaveBeenCalledWith({
      status: 'pending',
      dueBefore: '2026-10-08',
      page: 2,
      limit: 5,
    });

    await request(app.getHttpServer())
      .patch(`/admin/installments/${installmentId}/confirm-payment`)
      .set('Authorization', 'Bearer admin-token')
      .send({ paidAt: '2026-10-08T12:30:00.000Z' })
      .expect(200);
    expect(loansService.confirmInstallmentPayment).toHaveBeenCalledWith(
      installmentId,
      { userId: 'admin-id', role: UserRole.ADMIN },
      { paidAt: '2026-10-08T12:30:00.000Z' },
    );
  });

  it('documents loan endpoints, bearer auth, and response DTOs in Swagger', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(Object.keys(document.paths).sort()).toEqual([
      '/admin/installments',
      '/admin/installments/{id}/confirm-payment',
      '/admin/loan-requests',
      '/admin/loan-requests/{id}',
      '/admin/loan-requests/{id}/approve',
      '/admin/loan-requests/{id}/reject',
      '/admin/loans',
      '/admin/loans/{id}',
      '/admin/users',
      '/loan-requests',
      '/loan-requests/me',
      '/loans/me',
      '/loans/{id}/installments',
    ]);
    expect(document.paths['/loan-requests']?.post?.security).toEqual([
      { bearer: [] },
    ]);
    expect(document.components?.schemas?.CreateLoanRequestDto).toBeDefined();
    expect(document.components?.schemas?.LoanApprovalResponseDto).toBeDefined();
    expect(
      document.components?.schemas?.MyLoanRequestResponseDto,
    ).toBeDefined();
    expect(
      document.components?.schemas?.MyInstallmentResponseDto,
    ).toBeDefined();
    expect(document.paths['/admin/users']?.get?.security).toEqual([
      { bearer: [] },
    ]);
  });
});
