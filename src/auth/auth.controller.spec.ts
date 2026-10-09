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
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController /auth/me', () => {
  let app: INestApplication<App>;
  const profile = {
    id: 'user-id',
    fullName: 'علی رضایی',
    nationalCode: '0067995942',
    phone: '09123456789',
    email: null,
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const jwtService = {
      verifyAsync: jest.fn((token: string) => {
        if (token !== 'valid-access-token') {
          throw new Error('Invalid token');
        }
        return Promise.resolve({
          sub: 'user-id',
          role: UserRole.USER,
          tokenUse: 'access',
        });
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        JwtAuthGuard,
        {
          provide: AuthService,
          useValue: {
            getProfile: jest.fn().mockResolvedValue(profile),
            register: jest.fn(),
          },
        },
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
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401)
      .then((response) => {
        expect((response.body as { message: string }).message).toBe(
          'احراز هویت الزامی است.',
        );
      });
  });

  it('returns the current profile for a valid access token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer valid-access-token')
      .expect(200)
      .then((response) => {
        const body = response.body as Record<string, unknown>;
        expect(body.id).toBe('user-id');
        expect(body).not.toHaveProperty('password');
        expect(body).not.toHaveProperty('refreshTokenHash');
      });
  });

  it('documents all Auth routes and rejects a client-supplied role in Persian', async () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(Object.keys(document.paths).sort()).toEqual([
      '/auth/login',
      '/auth/me',
      '/auth/refresh',
      '/auth/register',
    ]);
    expect(document.paths['/auth/me']?.get?.security).toEqual([{ bearer: [] }]);
    expect(document.components?.schemas?.RegisterDto).toBeDefined();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'علی رضایی',
        nationalCode: '0067995942',
        phone: '09123456789',
        password: 'StrongPass123',
        role: 'admin',
      })
      .expect(400)
      .then((response) => {
        const body = response.body as { message: string[] };
        expect(body.message).toContain('فیلد role مجاز نیست.');
      });
  });
});
