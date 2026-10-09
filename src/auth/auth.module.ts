import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthTokenService } from './auth-token.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, JwtAuthGuard, RolesGuard],
  exports: [AuthTokenService, JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
