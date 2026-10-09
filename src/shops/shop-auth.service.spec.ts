import { UnauthorizedException } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import { createHash } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { AuthTokenService } from '../auth/auth-token.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionPaginationDto } from '../transactions/dto/transaction-pagination.dto';
import { Shop } from './entities/shop.entity';
import { ShopAccount } from './entities/shop-account.entity';
import { ShopAuthService } from './shop-auth.service';

const now = new Date('2026-10-08T12:00:00.000Z');
const shop: Shop = {
  id: '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb',
  name: 'فروشگاه نمونه',
  ownerName: 'علی رضایی',
  phone: '09120000000',
  address: 'تهران',
  description: null,
  qrCodeToken: 'not-returned',
  isActive: true,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

type MockQueryBuilder = {
  [key: string]: unknown;
  updates: Partial<ShopAccount>[];
};

function createQueryBuilder(result: unknown, affected = 1): MockQueryBuilder {
  const builder: MockQueryBuilder = { updates: [] };
  for (const method of [
    'addSelect',
    'innerJoin',
    'innerJoinAndSelect',
    'where',
    'andWhere',
    'update',
    'set',
  ]) {
    builder[method] = jest.fn((value?: Partial<ShopAccount>) => {
      if (method === 'set' && value) {
        builder.updates.push(value);
      }
      return builder;
    });
  }
  builder.getOne = jest.fn().mockResolvedValue(result);
  builder.execute = jest.fn().mockResolvedValue({ affected });
  return builder;
}

describe('ShopAuthService', () => {
  let service: ShopAuthService;
  let accountsRepository: Record<string, jest.Mock>;
  let shopsRepository: Record<string, jest.Mock>;
  let transactionsRepository: Record<string, jest.Mock>;
  let authTokenService: jest.Mocked<AuthTokenService>;
  let queryBuilders: ReturnType<typeof createQueryBuilder>[];
  let savedAccounts: ShopAccount[];

  beforeEach(() => {
    queryBuilders = [];
    savedAccounts = [];
    accountsRepository = {
      createQueryBuilder: jest.fn(
        () => queryBuilders.shift() as ReturnType<typeof createQueryBuilder>,
      ),
      create: jest.fn((value: ShopAccount) => value),
      save: jest.fn((value: ShopAccount) => {
        savedAccounts.push(value);
        return Promise.resolve(value);
      }),
      findAndCount: jest.fn(),
    };
    shopsRepository = {
      findOneBy: jest.fn(() => Promise.resolve(shop)),
    };
    transactionsRepository = {
      findAndCount: jest.fn(() =>
        Promise.resolve([[], 0] as [Transaction[], number]),
      ),
      find: jest.fn(() => Promise.resolve([] as Transaction[])),
      createQueryBuilder: jest.fn(),
    };
    authTokenService = {
      createTokens: jest.fn().mockResolvedValue({
        accessToken: 'shop-access-token',
        refreshToken: 'shop-refresh-token',
      }),
      verifyRefreshToken: jest.fn(),
      hashToken: jest.fn((token: string) =>
        createHash('sha256').update(token).digest('hex'),
      ),
      safeHashEquals: jest.fn((left: string, right: string) => left === right),
    } as unknown as jest.Mocked<AuthTokenService>;
    service = new ShopAuthService(
      accountsRepository as unknown as Repository<ShopAccount>,
      shopsRepository as unknown as Repository<Shop>,
      transactionsRepository as unknown as Repository<Transaction>,
      authTokenService,
      {} as DataSource,
    );
  });

  it('provisions only a hashed setup token with a short expiry', async () => {
    queryBuilders.push(createQueryBuilder(null));

    const result = await service.provisionCredentials(shop.id);
    const savedAccount = savedAccounts[0];

    expect(result.setupToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.loginIdentifier).toBe(shop.phone);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 30 * 60 * 1000,
    );
    expect(savedAccount.setupTokenHash).toBe(
      authTokenService.hashToken(result.setupToken),
    );
    expect(savedAccount.setupTokenHash).not.toBe(result.setupToken);
    expect(savedAccount).not.toHaveProperty('setupToken');
  });

  it('sets a bcrypt password once and consumes the setup token atomically', async () => {
    const account = { id: 'account-id' };
    const lookup = createQueryBuilder(account);
    const consume = createQueryBuilder(null, 1);
    const reused = createQueryBuilder(null);
    queryBuilders.push(lookup, consume, reused);
    const dto = {
      setupToken: 'a-setup-token-value-long-enough',
      password: 'Password123',
    };

    await expect(service.setPassword(dto)).resolves.toEqual({
      message: 'رمز عبور فروشگاه با موفقیت تنظیم شد.',
    });
    const update = consume.updates[0];
    expect(update.passwordHash).toMatch(/^\$2/);
    expect(await compare(dto.password, update.passwordHash!)).toBe(true);
    expect(update.setupTokenHash).toBeNull();
    expect(update.setupTokenExpiresAt).toBeNull();
    expect(consume.andWhere).toHaveBeenCalledWith('"passwordHash" IS NULL');
    await expect(service.setPassword(dto)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired setup token', async () => {
    queryBuilders.push(createQueryBuilder(null));

    await expect(
      service.setPassword({
        setupToken: 'expired-setup-token-value-long-enough',
        password: 'Password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('logs in with a password and returns no credential or QR fields', async () => {
    const account = {
      shopId: shop.id,
      loginPhone: shop.phone,
      passwordHash: await hash('Password123', 4),
      shop,
    };
    queryBuilders.push(createQueryBuilder(account));

    const result = await service.login({
      identifier: shop.phone,
      password: 'Password123',
    });

    expect(result).toMatchObject({
      accessToken: 'shop-access-token',
      refreshToken: 'shop-refresh-token',
      shop: { id: shop.id, phone: shop.phone },
    });
    expect(result.shop).not.toHaveProperty('qrCodeToken');
    expect(result.shop).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('setupTokenHash');
    expect(authTokenService.createTokens.mock.calls[0]?.[0]).toEqual({
      sub: shop.id,
      principalType: 'shop',
    });
  });

  it('uses the same unauthorized response for unknown, inactive, and wrong-password attempts', async () => {
    queryBuilders.push(
      createQueryBuilder(null),
      createQueryBuilder(null),
      createQueryBuilder({
        passwordHash: await hash('Password123', 4),
        shop,
      }),
    );

    for (const identifier of ['unknown', shop.phone, shop.phone]) {
      await expect(
        service.login({ identifier, password: 'Incorrect123' }),
      ).rejects.toThrow('اطلاعات ورود فروشگاه معتبر نیست.');
    }
  });

  it('scopes shop transaction history to the authenticated shop and validates pagination bounds upstream', async () => {
    queryBuilders.push(createQueryBuilder({ id: 'shop-account' }));
    const pagination = Object.assign(new TransactionPaginationDto(), {
      page: 2,
      limit: 5,
    });

    const result = await service.getTransactions(shop.id, pagination);

    expect(result).toEqual({ items: [], page: 2, limit: 5, total: 0 });
    expect(transactionsRepository.findAndCount).toHaveBeenCalledWith({
      where: { shopId: shop.id },
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 5,
    });
  });
});
