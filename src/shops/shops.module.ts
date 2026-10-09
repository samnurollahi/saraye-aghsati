import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Shop } from './entities/shop.entity';
import { ShopAccount } from './entities/shop-account.entity';
import { ShopAuthModule } from './shop-auth.module';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shop, ShopAccount]),
    AuthModule,
    ShopAuthModule,
  ],
  controllers: [ShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
