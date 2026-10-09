import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, timingSafeEqual } from 'crypto';
import { QueryFailedError } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/user-role.enum';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    if (await this.usersService.findByNationalCode(dto.nationalCode)) {
      throw new ConflictException('این کد ملی قبلاً ثبت شده است.');
    }
    if (await this.usersService.findByPhone(dto.phone)) {
      throw new ConflictException('این شماره موبایل قبلاً ثبت شده است.');
    }

    let user: User;
    try {
      user = await this.usersService.create({
        fullName: dto.fullName,
        nationalCode: dto.nationalCode,
        phone: dto.phone,
        email: dto.email ?? null,
        password: await hash(dto.password, 12),
        role: UserRole.USER,
      });
    } catch (error) {
      const queryError = error as QueryFailedError & {
        driverError?: { code?: string; constraint?: string };
      };
      if (queryError.driverError?.code === '23505') {
        if (queryError.driverError.constraint?.includes('national_code')) {
          throw new ConflictException('این کد ملی قبلاً ثبت شده است.');
        }
        if (queryError.driverError.constraint?.includes('phone')) {
          throw new ConflictException('این شماره موبایل قبلاً ثبت شده است.');
        }
      }
      throw error;
    }

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findForLogin(dto.identifier);
    if (!user) {
      throw new UnauthorizedException('کاربر یافت نشد.');
    }
    if (!(await compare(dto.password, user.password))) {
      throw new UnauthorizedException('رمز عبور نادرست است.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('حساب کاربری غیرفعال است.');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('رفرش توکن معتبر نیست.');
    }

    if (
      payload.tokenUse !== 'refresh' ||
      typeof payload.sub !== 'string' ||
      !Object.values(UserRole).includes(payload.role)
    ) {
      throw new UnauthorizedException('رفرش توکن معتبر نیست.');
    }

    const user = await this.usersService.findByIdWithRefreshTokenHash(
      payload.sub,
    );
    if (!user?.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('رفرش توکن معتبر نیست.');
    }

    const currentHash = this.hashToken(refreshToken);
    if (!this.safeHashEquals(currentHash, user.refreshTokenHash)) {
      throw new UnauthorizedException('رفرش توکن معتبر نیست.');
    }

    const tokens = await this.createTokens(user);
    const rotated = await this.usersService.rotateRefreshTokenHash(
      user.id,
      currentHash,
      this.hashToken(tokens.refreshToken),
    );
    if (!rotated) {
      throw new UnauthorizedException('رفرش توکن قبلاً استفاده شده است.');
    }

    return { ...tokens, user: this.toUserResponse(user) };
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('حساب کاربری در دسترس نیست.');
    }
    return this.toUserResponse(user);
  }

  private async issueTokens(user: User): Promise<AuthResponseDto> {
    const tokens = await this.createTokens(user);
    await this.usersService.updateRefreshTokenHash(
      user.id,
      this.hashToken(tokens.refreshToken),
    );
    return { ...tokens, user: this.toUserResponse(user) };
  }

  private createTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const basePayload = { sub: user.id, role: user.role };
    return Promise.all([
      this.jwtService.signAsync(
        { ...basePayload, tokenUse: 'access' },
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { ...basePayload, tokenUse: 'refresh' },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]).then(([accessToken, refreshToken]) => ({ accessToken, refreshToken }));
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private safeHashEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      nationalCode: user.nationalCode,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
