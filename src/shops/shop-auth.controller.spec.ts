import {
  BadRequestException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserRole } from '../users/user-role.enum';
import { ShopAuthController } from './shop-auth.controller';
import { ShopAuthService } from './shop-auth.service';
import { ShopJwtAuthGuard } from './guards/shop-jwt-auth.guard';

const shopId = '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb';
const shopProfile = {
  id: shopId,
  name: 'فروشگاه نمونه',
  ownerName: 'علی رضایی',
  phone: '09120000000',
  address: 'تهران',
  description: null,
  isActive: true,
  createdAt: '2026-10-08T12:00:00.000Z',
  updatedAt: '2026-10-08T12:00:00.000Z',
};

describe('ShopAuthController', () => {
  let app: INestApplication<App>;
  const shopAuthService = {
    login: jest.fn().mockResolvedValue({
      accessToken: 'shop-access-token',
      refreshToken: 'shop-refresh-token',
      shop: shopProfile,
    }),
    setPassword: jest.fn().mockResolvedValue({ message: 'رمز عبور تنظیم شد.' }),
    refresh: jest.fn(),
    assertEligibleShop: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(shopProfile),
    getDashboard: jest.fn().mockResolvedValue({
      shop: shopProfile,
      transactionCount: 0,
      totalTransactionAmount: '0',
      recentTransactions: [],
    }),
    getTransactions: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    }),
  };

  beforeEach(async () => {
    const jwtService = {
      verifyAsync: jest.fn((token: string) => {
        if (token === 'shop-token') {
          return Promise.resolve({
            sub: shopId,
            principalType: 'shop',
            tokenUse: 'access',
          });
        }
        if (token === 'user-token') {
          return Promise.resolve({
            sub: 'user-id',
            principalType: 'user',
            role: UserRole.USER,
            tokenUse: 'access',
          });
        }
        if (token === 'admin-token') {
          return Promise.resolve({
            sub: 'admin-id',
            principalType: 'user',
            role: UserRole.ADMIN,
            tokenUse: 'access',
          });
        }
        throw new Error('Invalid token');
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ShopAuthController],
      providers: [
        ShopJwtAuthGuard,
        { provide: ShopAuthService, useValue: shopAuthService },
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

  it('validates login payload, normalizes phone digits, and returns no secrets in the shop profile', async () => {
    await request(app.getHttpServer())
      .post('/shop-auth/login')
      .send({ identifier: '۰۹۱۲۰۰۰۰۰۰۰', password: 'Password123' })
      .expect(200)
      .then(({ body }) => {
        const response = body as { shop: Record<string, unknown> };
        expect(response.shop.id).toBe(shopId);
        expect(response.shop).not.toHaveProperty('qrCodeToken');
        expect(response.shop).not.toHaveProperty('passwordHash');
      });
    expect(shopAuthService.login).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: '09120000000' }),
    );
  });

  it('requires a shop token and rejects user and admin tokens for shop APIs', async () => {
    await request(app.getHttpServer()).get('/shop-auth/me').expect(401);
    for (const token of ['user-token', 'admin-token']) {
      await request(app.getHttpServer())
        .get('/shop-auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
    await request(app.getHttpServer())
      .get('/shop-auth/me')
      .set('Authorization', 'Bearer shop-token')
      .expect(200);
    expect(shopAuthService.assertEligibleShop).toHaveBeenCalledWith(shopId);
    expect(shopAuthService.getProfile).toHaveBeenCalledWith(shopId);
  });

  it('rechecks shop eligibility on every protected request', async () => {
    shopAuthService.assertEligibleShop.mockRejectedValueOnce(
      new UnauthorizedException('حساب فروشگاه در دسترس نیست.'),
    );

    await request(app.getHttpServer())
      .get('/shop-auth/me')
      .set('Authorization', 'Bearer shop-token')
      .expect(401);
    expect(shopAuthService.getProfile).not.toHaveBeenCalled();
  });

  it('uses the token identity for dashboard and transaction history', async () => {
    await request(app.getHttpServer())
      .get('/shop-auth/dashboard')
      .set('Authorization', 'Bearer shop-token')
      .expect(200);
    await request(app.getHttpServer())
      .get('/shop-auth/transactions?page=2&limit=5')
      .set('Authorization', 'Bearer shop-token')
      .expect(200);
    expect(shopAuthService.getDashboard).toHaveBeenCalledWith(shopId);
    expect(shopAuthService.getTransactions).toHaveBeenCalledWith(
      shopId,
      expect.objectContaining({ page: 2, limit: 5 }),
    );
    await request(app.getHttpServer())
      .get('/shop-auth/transactions?limit=101')
      .set('Authorization', 'Bearer shop-token')
      .expect(400);
  });

  it('generates Swagger paths, bearer requirements, and request schemas', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(document.paths['/shop-auth/login']?.post?.requestBody).toBeDefined();
    expect(document.paths['/shop-auth/setup-password']?.post).toBeDefined();
    expect(document.paths['/shop-auth/me']?.get?.security).toEqual([
      { bearer: [] },
    ]);
    expect(document.paths['/shop-auth/dashboard']?.get?.security).toEqual([
      { bearer: [] },
    ]);
    expect(document.paths['/shop-auth/transactions']?.get).toBeDefined();
    expect(document.paths['/shop-auth/transactions']?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'page', in: 'query' }),
        expect.objectContaining({ name: 'limit', in: 'query' }),
      ]),
    );
    expect(document.components?.schemas?.ShopLoginDto).toBeDefined();
    expect(document.components?.schemas?.SetShopPasswordDto).toBeDefined();
  });
});
