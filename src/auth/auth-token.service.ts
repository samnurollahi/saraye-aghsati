import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'node:crypto';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createTokens(
    payload: Omit<JwtPayload, 'tokenUse'>,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return Promise.all([
      this.jwtService.signAsync(
        { ...payload, tokenUse: 'access' },
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { ...payload, tokenUse: 'refresh' },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]).then(([accessToken, refreshToken]) => ({ accessToken, refreshToken }));
  }

  verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  safeHashEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}
