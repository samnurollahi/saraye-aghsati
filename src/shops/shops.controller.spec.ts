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
import { ShopsController } from './shops.controller';
import { ShopAuthService } from './shop-auth.service';
import { ShopsService } from './shops.service';

const shopId = '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb';
const shopResponse = {
  id: shopId,
  name: 'فروشگاه نمونه',
  ownerName: 'علی رضایی',
  phone: '09120000000',
  address: 'تهران',
  description: 'فروشگاه لوازم خانگی',
  isActive: true,
  createdAt: '2026-10-08T12:00:00.000Z',
  updatedAt: '2026-10-08T12:00:00.000Z',
};

describe('ShopsController', () => {
  let app: INestApplication<App>;
  const shopsService = {
    create: jest.fn().mockResolvedValue(shopResponse),
    list: jest.fn().mockResolvedValue({
      items: [shopResponse],
      page: 2,
      limit: 5,
      total: 11,
    }),
    update: jest.fn().mockResolvedValue({ ...shopResponse, isActive: false }),
    remove: jest.fn().mockResolvedValue(undefined),
    createQrCode: jest.fn().mockResolvedValue('data:image/png;base64,cXJjb2Rl'),
    scan: jest.fn().mockResolvedValue({
      id: shopId,
      name: shopResponse.name,
      ownerName: shopResponse.ownerName,
      phone: shopResponse.phone,
      address: shopResponse.address,
      description: shopResponse.description,
    }),
  };
  const shopAuthService = {
    provisionCredentials: jest.fn().mockResolvedValue({
      setupToken: 'temporary-setup-token',
      loginIdentifier: '09120000000',
      expiresAt: '2026-10-08T12:30:00.000Z',
    }),
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
        if (token === 'shop-token') {
          return Promise.resolve({
            sub: shopId,
            principalType: 'shop',
            tokenUse: 'access',
          });
        }
        throw new Error('Invalid token');
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ShopsController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        { provide: ShopsService, useValue: shopsService },
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

  const validCreateBody = {
    name: 'فروشگاه نمونه',
    ownerName: 'علی رضایی',
    phone: '09120000000',
    address: 'تهران',
    description: 'فروشگاه لوازم خانگی',
  };

  it('requires authentication and rejects non-admin users from admin APIs', async () => {
    await request(app.getHttpServer())
      .post('/admin/shops')
      .send(validCreateBody)
      .expect(401);
    await request(app.getHttpServer())
      .post('/admin/shops')
      .set('Authorization', 'Bearer user-token')
      .send(validCreateBody)
      .expect(403);
    await request(app.getHttpServer())
      .post('/admin/shops')
      .set('Authorization', 'Bearer shop-token')
      .send(validCreateBody)
      .expect(401);
    expect(shopsService.create).not.toHaveBeenCalled();
  });

  it('allows only an admin to provision a setup token', async () => {
    await request(app.getHttpServer())
      .post(`/admin/shops/${shopId}/credentials/setup-token`)
      .set('Authorization', 'Bearer user-token')
      .expect(403);
    await request(app.getHttpServer())
      .post(`/admin/shops/${shopId}/credentials/setup-token`)
      .set('Authorization', 'Bearer admin-token')
      .expect(201)
      .then(({ body }) => {
        const response = body as { setupToken: string };
        expect(response.setupToken).toBe('temporary-setup-token');
      });
    expect(shopAuthService.provisionCredentials).toHaveBeenCalledWith(shopId);
  });

  it('allows an admin to create a shop', async () => {
    await request(app.getHttpServer())
      .post('/admin/shops')
      .set('Authorization', 'Bearer admin-token')
      .send(validCreateBody)
      .expect(201)
      .then(({ body }) => {
        expect(body).not.toHaveProperty('qrCodeToken');
      });
    expect(shopsService.create).toHaveBeenCalledWith(validCreateBody);
  });

  it('paginates the admin shop list', async () => {
    await request(app.getHttpServer())
      .get('/admin/shops?page=2&limit=5')
      .set('Authorization', 'Bearer admin-token')
      .expect(200)
      .then(({ body }) =>
        expect(body).toMatchObject({ page: 2, limit: 5, total: 11 }),
      );
    expect(shopsService.list).toHaveBeenCalledWith({ page: 2, limit: 5 });
  });

  it('updates shop fields and deactivates a shop', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/shops/${shopId}`)
      .set('Authorization', 'Bearer admin-token')
      .send({ name: 'نام جدید' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/admin/shops/${shopId}`)
      .set('Authorization', 'Bearer admin-token')
      .send({ isActive: false })
      .expect(200)
      .then(({ body }) => expect(body.isActive).toBe(false));
    expect(shopsService.update).toHaveBeenNthCalledWith(1, shopId, {
      name: 'نام جدید',
    });
    expect(shopsService.update).toHaveBeenNthCalledWith(2, shopId, {
      isActive: false,
    });
  });

  it('validates UUID routes and returns QR data only to admins', async () => {
    await request(app.getHttpServer())
      .get('/admin/shops/not-a-uuid/qr')
      .set('Authorization', 'Bearer admin-token')
      .expect(400);
    await request(app.getHttpServer())
      .get(`/admin/shops/${shopId}/qr`)
      .set('Authorization', 'Bearer user-token')
      .expect(403);
    await request(app.getHttpServer())
      .get(`/admin/shops/${shopId}/qr`)
      .set('Authorization', 'Bearer admin-token')
      .expect(200)
      .then(({ body }) =>
        expect(body.qrCode).toMatch(/^data:image\/png;base64,/),
      );
    expect(shopsService.createQrCode).toHaveBeenCalledWith(shopId);
  });

  it('returns public scan details without internal fields', async () => {
    await request(app.getHttpServer())
      .get('/shops/scan/secure-random-token')
      .expect(200)
      .then(({ body }) => {
        expect(body).toHaveProperty('name', 'فروشگاه نمونه');
        expect(body).not.toHaveProperty('qrCodeToken');
        expect(body).not.toHaveProperty('isActive');
      });
    expect(shopsService.scan).toHaveBeenCalledWith('secure-random-token');
  });
});
