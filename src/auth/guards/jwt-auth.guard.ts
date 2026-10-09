import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserRole } from '../../users/user-role.enum';
import { AuthenticatedUser, JwtPayload } from '../auth.types';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('احراز هویت الزامی است.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (
        payload.tokenUse !== 'access' ||
        typeof payload.sub !== 'string' ||
        payload.principalType === 'shop' ||
        !payload.role ||
        !Object.values(UserRole).includes(payload.role)
      ) {
        throw new Error('Invalid access token payload');
      }
      request.user = {
        principalType: 'user',
        userId: payload.sub,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('توکن دسترسی معتبر نیست.');
    }
  }
}
