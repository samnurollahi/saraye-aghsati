import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/user-role.enum';
import { UsersService } from '../users/users.service';
import { AuthTokenService } from './auth-token.service';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authTokenService: AuthTokenService,
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
      payload = await this.authTokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('رفرش توکن معتبر نیست.');
    }

    if (
      payload.tokenUse !== 'refresh' ||
      typeof payload.sub !== 'string' ||
      payload.principalType === 'shop' ||
      !payload.role ||
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

    const currentHash = this.authTokenService.hashToken(refreshToken);
    if (
      !this.authTokenService.safeHashEquals(currentHash, user.refreshTokenHash)
    ) {
      throw new UnauthorizedException('رفرش توکن معتبر نیست.');
    }

    const tokens = await this.createTokens(user);
    const rotated = await this.usersService.rotateRefreshTokenHash(
      user.id,
      currentHash,
      this.authTokenService.hashToken(tokens.refreshToken),
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
      this.authTokenService.hashToken(tokens.refreshToken),
    );
    return { ...tokens, user: this.toUserResponse(user) };
  }

  private createTokens(user: User) {
    return this.authTokenService.createTokens({
      sub: user.id,
      role: user.role,
      principalType: 'user',
    });
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
