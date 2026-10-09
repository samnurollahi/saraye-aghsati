import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { AuthTokenService } from '../auth/auth-token.service';
import { JwtPayload } from '../auth/auth.types';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionPaginationDto } from '../transactions/dto/transaction-pagination.dto';
import { TransactionStatus } from '../transactions/transaction.enums';
import { Shop } from './entities/shop.entity';
import { ShopAccount } from './entities/shop-account.entity';
import { normalizeIranianPhone } from './phone-normalizer';
import { SetShopPasswordDto } from './dto/set-shop-password.dto';
import { ShopLoginDto } from './dto/shop-login.dto';
import {
  PaginatedShopTransactionResponseDto,
  ShopAuthResponseDto,
  ShopDashboardResponseDto,
  ShopProfileResponseDto,
  ShopSetupTokenResponseDto,
  ShopTransactionResponseDto,
} from './dto/shop-auth-response.dto';

const PASSWORD_HASH_ROUNDS = 12;
const SETUP_TOKEN_LIFETIME_MS = 30 * 60 * 1000;

@Injectable()
export class ShopAuthService {
  constructor(
    @InjectRepository(ShopAccount)
    private readonly accountsRepository: Repository<ShopAccount>,
    @InjectRepository(Shop)
    private readonly shopsRepository: Repository<Shop>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly authTokenService: AuthTokenService,
    private readonly dataSource: DataSource,
  ) {}

  async provisionCredentials(
    shopId: string,
  ): Promise<ShopSetupTokenResponseDto> {
    const shop = await this.shopsRepository.findOneBy({ id: shopId });
    if (!shop || !shop.isActive) {
      throw new ConflictException('فقط فروشگاه فعال قابل راه‌اندازی است.');
    }

    const loginIdentifier = normalizeIranianPhone(shop.phone);
    const setupToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SETUP_TOKEN_LIFETIME_MS);
    let account = await this.accountsRepository
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.shopId = :shopId', { shopId })
      .getOne();
    if (account?.passwordHash) {
      throw new ConflictException(
        'برای این فروشگاه رمز عبور قبلاً تنظیم شده است.',
      );
    }

    if (!account) {
      account = this.accountsRepository.create({
        shopId,
        loginPhone: loginIdentifier,
        passwordHash: null,
        refreshTokenHash: null,
        setupTokenHash: this.authTokenService.hashToken(setupToken),
        setupTokenExpiresAt: expiresAt,
      });
    } else {
      account.loginPhone = loginIdentifier;
      account.setupTokenHash = this.authTokenService.hashToken(setupToken);
      account.setupTokenExpiresAt = expiresAt;
      account.refreshTokenHash = null;
    }

    try {
      await this.accountsRepository.save(account);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'شماره تماس این فروشگاه تکراری است؛ پیش از راه‌اندازی باید شماره یکتا تعیین شود.',
        );
      }
      throw error;
    }

    return { setupToken, loginIdentifier, expiresAt };
  }

  async setPassword(dto: SetShopPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.authTokenService.hashToken(dto.setupToken);
    const account = await this.accountsRepository
      .createQueryBuilder('account')
      .innerJoin('account.shop', 'shop')
      .where('account.setupTokenHash = :tokenHash', { tokenHash })
      .andWhere('account.setupTokenExpiresAt > :now', { now: new Date() })
      .andWhere('shop.isActive = true')
      .andWhere('shop.deletedAt IS NULL')
      .getOne();
    if (!account) {
      throw new UnauthorizedException(
        'توکن راه‌اندازی معتبر نیست یا منقضی شده است.',
      );
    }

    const passwordHash = await hash(dto.password, PASSWORD_HASH_ROUNDS);
    const result = await this.accountsRepository
      .createQueryBuilder()
      .update(ShopAccount)
      .set({
        passwordHash,
        setupTokenHash: null,
        setupTokenExpiresAt: null,
        refreshTokenHash: null,
      })
      .where('"id" = :id', { id: account.id })
      .andWhere('"setupTokenHash" = :tokenHash', { tokenHash })
      .andWhere('"setupTokenExpiresAt" > :now', { now: new Date() })
      .andWhere('"passwordHash" IS NULL')
      .execute();

    if (result.affected !== 1) {
      throw new UnauthorizedException(
        'توکن راه‌اندازی معتبر نیست یا مصرف شده است.',
      );
    }
    return { message: 'رمز عبور فروشگاه با موفقیت تنظیم شد.' };
  }

  async login(dto: ShopLoginDto): Promise<ShopAuthResponseDto> {
    const loginPhone = normalizeIranianPhone(dto.identifier);
    const account = await this.accountsRepository
      .createQueryBuilder('account')
      .innerJoinAndSelect(
        'account.shop',
        'shop',
        'shop.isActive = true AND shop.deletedAt IS NULL',
      )
      .addSelect('account.passwordHash')
      .where('account.loginPhone = :loginPhone', { loginPhone })
      .getOne();

    if (
      !account?.passwordHash ||
      !(await compare(dto.password, account.passwordHash))
    ) {
      throw new UnauthorizedException('اطلاعات ورود فروشگاه معتبر نیست.');
    }
    return this.issueTokens(account, account.shop);
  }

  async refresh(dto: RefreshTokenDto): Promise<ShopAuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = await this.authTokenService.verifyRefreshToken(
        dto.refreshToken,
      );
    } catch {
      throw new UnauthorizedException('رفرش توکن فروشگاه معتبر نیست.');
    }

    if (
      payload.tokenUse !== 'refresh' ||
      payload.principalType !== 'shop' ||
      typeof payload.sub !== 'string'
    ) {
      throw new UnauthorizedException('رفرش توکن فروشگاه معتبر نیست.');
    }

    const account = await this.accountsRepository
      .createQueryBuilder('account')
      .innerJoinAndSelect(
        'account.shop',
        'shop',
        'shop.isActive = true AND shop.deletedAt IS NULL',
      )
      .addSelect('account.refreshTokenHash')
      .where('account.shopId = :shopId', { shopId: payload.sub })
      .getOne();
    if (!account?.refreshTokenHash) {
      throw new UnauthorizedException('رفرش توکن فروشگاه معتبر نیست.');
    }

    const currentHash = this.authTokenService.hashToken(dto.refreshToken);
    if (
      !this.authTokenService.safeHashEquals(
        currentHash,
        account.refreshTokenHash,
      )
    ) {
      throw new UnauthorizedException('رفرش توکن فروشگاه معتبر نیست.');
    }

    const tokens = await this.authTokenService.createTokens({
      sub: account.shopId,
      principalType: 'shop',
    });
    const rotated = await this.accountsRepository
      .createQueryBuilder()
      .update(ShopAccount)
      .set({
        refreshTokenHash: this.authTokenService.hashToken(tokens.refreshToken),
      })
      .where('"id" = :id', { id: account.id })
      .andWhere('"refreshTokenHash" = :currentHash', { currentHash })
      .execute();
    if (rotated.affected !== 1) {
      throw new UnauthorizedException('رفرش توکن قبلاً استفاده شده است.');
    }

    return {
      ...tokens,
      shop: this.toProfile(account.shop),
    };
  }

  async assertEligibleShop(shopId: string): Promise<void> {
    const account = await this.accountsRepository
      .createQueryBuilder('account')
      .innerJoin(
        'account.shop',
        'shop',
        'shop.isActive = true AND shop.deletedAt IS NULL',
      )
      .where('account.shopId = :shopId', { shopId })
      .andWhere('account.passwordHash IS NOT NULL')
      .getOne();
    if (!account) {
      throw new UnauthorizedException('حساب فروشگاه در دسترس نیست.');
    }
  }

  async getProfile(shopId: string): Promise<ShopProfileResponseDto> {
    await this.assertEligibleShop(shopId);
    const shop = await this.shopsRepository.findOneBy({
      id: shopId,
      isActive: true,
    });
    if (!shop) {
      throw new UnauthorizedException('حساب فروشگاه در دسترس نیست.');
    }
    return this.toProfile(shop);
  }

  async getDashboard(shopId: string): Promise<ShopDashboardResponseDto> {
    const shop = await this.getProfile(shopId);
    const completed = this.transactionsRepository
      .createQueryBuilder('transaction')
      .where('transaction.shopId = :shopId', { shopId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      });
    const transactionCount = await completed.getCount();
    const aggregate = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.amount), 0)', 'amount')
      .where('transaction.shopId = :shopId', { shopId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .getRawOne<{ amount: string }>();
    const recent = await this.transactionsRepository.find({
      where: { shopId, status: TransactionStatus.COMPLETED },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return {
      shop,
      transactionCount,
      totalTransactionAmount: aggregate?.amount ?? '0',
      recentTransactions: recent.map(toShopTransaction),
    };
  }

  async getTransactions(
    shopId: string,
    pagination: TransactionPaginationDto,
  ): Promise<PaginatedShopTransactionResponseDto> {
    await this.assertEligibleShop(shopId);
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const [transactions, total] =
      await this.transactionsRepository.findAndCount({
        where: { shopId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    return {
      items: transactions.map(toShopTransaction),
      page,
      limit,
      total,
    };
  }

  private async issueTokens(
    account: ShopAccount,
    shop: Shop,
  ): Promise<ShopAuthResponseDto> {
    const tokens = await this.authTokenService.createTokens({
      sub: shop.id,
      principalType: 'shop',
    });
    account.refreshTokenHash = this.authTokenService.hashToken(
      tokens.refreshToken,
    );
    await this.accountsRepository.save(account);
    return { ...tokens, shop: this.toProfile(shop) };
  }

  private toProfile(shop: Shop): ShopProfileResponseDto {
    return {
      id: shop.id,
      name: shop.name,
      ownerName: shop.ownerName,
      phone: shop.phone,
      address: shop.address,
      description: shop.description,
      isActive: shop.isActive,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt,
    };
  }
}

function toShopTransaction(
  transaction: Transaction,
): ShopTransactionResponseDto {
  return {
    id: transaction.id,
    amount: transaction.amount,
    description: transaction.description,
    status: transaction.status,
    createdAt: transaction.createdAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { driverError?: { code?: string } })
      .driverError?.code === '23505'
  );
}
