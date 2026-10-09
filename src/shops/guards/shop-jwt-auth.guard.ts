import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload, AuthenticatedShop } from '../../auth/auth.types';
import { ShopAuthService } from '../shop-auth.service';

type ShopRequest = Request & { shop: AuthenticatedShop };

@Injectable()
export class ShopJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly shopAuthService: ShopAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ShopRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('احراز هویت فروشگاه الزامی است.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (
        payload.tokenUse !== 'access' ||
        payload.principalType !== 'shop' ||
        typeof payload.sub !== 'string'
      ) {
        throw new Error('Invalid shop access token payload');
      }
      await this.shopAuthService.assertEligibleShop(payload.sub);
      request.shop = { principalType: 'shop', shopId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('توکن فروشگاه معتبر یا فعال نیست.');
    }
  }
}
