import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { createHash } from 'crypto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/user-role.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  const configService = {
    getOrThrow: jest.fn((key: string) => `${key}-test-secret`),
  } as unknown as ConfigService;

  const createUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-id',
    fullName: 'علی رضایی',
    nationalCode: '0067995942',
    phone: '09123456789',
    email: null,
    password: 'hashed-password',
    role: UserRole.USER,
    isActive: true,
    refreshTokenHash: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findByNationalCode: jest.fn(),
      findByPhone: jest.fn(),
      findForLogin: jest.fn(),
      findById: jest.fn(),
      findByIdWithRefreshTokenHash: jest.fn(),
      updateRefreshTokenHash: jest.fn(),
      rotateRefreshTokenHash: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    jwtService = {
      signAsync: jest.fn((payload: { tokenUse: string }) =>
        Promise.resolve(`${payload.tokenUse}-token`),
      ),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    service = new AuthService(usersService, jwtService, configService);
  });

  it('registers as user, hashes the password, and returns tokens without sensitive fields', async () => {
    const user = createUser();
    usersService.create.mockImplementation((data) => {
      expect(data.role).toBe(UserRole.USER);
      expect(data.password).not.toBe('Password123');
      expect(data.password).toMatch(/^\$2/);
      return Promise.resolve({ ...user, ...data });
    });

    const response = await service.register({
      fullName: 'علی رضایی',
      nationalCode: '0067995942',
      phone: '09123456789',
      password: 'Password123',
    });

    expect(response.accessToken).toBe('access-token');
    expect(response.refreshToken).toBe('refresh-token');
    expect(response.user).not.toHaveProperty('password');
    expect(response.user).not.toHaveProperty('refreshTokenHash');
    expect(usersService.updateRefreshTokenHash.mock.calls).toContainEqual([
      'user-id',
      expect.any(String),
    ]);
  });

  it('rejects a duplicate national code', async () => {
    usersService.findByNationalCode.mockResolvedValue(createUser());

    await expect(
      service.register({
        fullName: 'علی رضایی',
        nationalCode: '0067995942',
        phone: '09123456789',
        password: 'Password123',
      }),
    ).rejects.toThrow(new ConflictException('این کد ملی قبلاً ثبت شده است.'));
    expect(usersService.create.mock.calls).toHaveLength(0);
  });

  it('logs in with a valid password', async () => {
    usersService.findForLogin.mockResolvedValue(
      createUser({ password: await hash('Password123', 4) }),
    );

    const response = await service.login({
      identifier: '09123456789',
      password: 'Password123',
    });

    expect(response.accessToken).toBe('access-token');
    expect(response.user.phone).toBe('09123456789');
  });

  it('rejects an incorrect password and an inactive account', async () => {
    const storedPassword = await hash('Password123', 4);
    usersService.findForLogin.mockResolvedValue(
      createUser({ password: storedPassword }),
    );
    await expect(
      service.login({ identifier: '09123456789', password: 'WrongPass123' }),
    ).rejects.toThrow(new UnauthorizedException('رمز عبور نادرست است.'));

    usersService.findForLogin.mockResolvedValue(
      createUser({ password: storedPassword, isActive: false }),
    );
    await expect(
      service.login({ identifier: '09123456789', password: 'Password123' }),
    ).rejects.toThrow(new UnauthorizedException('حساب کاربری غیرفعال است.'));
  });

  it('rotates a valid refresh token and rejects concurrent reuse', async () => {
    const currentTokenHash = createHash('sha256')
      .update('refresh-token')
      .digest('hex');
    usersService.findByIdWithRefreshTokenHash.mockResolvedValue(
      createUser({ refreshTokenHash: currentTokenHash }),
    );
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      role: UserRole.USER,
      tokenUse: 'refresh',
    });
    usersService.rotateRefreshTokenHash.mockResolvedValue(true);

    const response = await service.refresh('refresh-token');

    expect(response.refreshToken).toBe('refresh-token');
    expect(usersService.rotateRefreshTokenHash.mock.calls).toContainEqual([
      'user-id',
      currentTokenHash,
      expect.any(String),
    ]);
    usersService.rotateRefreshTokenHash.mockResolvedValue(false);
    await expect(service.refresh('refresh-token')).rejects.toThrow(
      new UnauthorizedException('رفرش توکن قبلاً استفاده شده است.'),
    );
  });
});
