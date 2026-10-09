import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Shop } from './entities/shop.entity';
import { ShopAccount } from './entities/shop-account.entity';
import { ShopAuthController } from './shop-auth.controller';
import { ShopAuthService } from './shop-auth.service';
import { ShopJwtAuthGuard } from './guards/shop-jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopAccount, Shop, Transaction]),
    AuthModule,
  ],
  controllers: [ShopAuthController],
  providers: [ShopAuthService, ShopJwtAuthGuard],
  exports: [ShopAuthService],
})
export class ShopAuthModule {}
