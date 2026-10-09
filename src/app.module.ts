import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { buildDatabaseOptions } from './database/database.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LoansModule } from './loans/loans.module';
import { ShopsModule } from './shops/shops.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(buildDatabaseOptions()),
    UsersModule,
    AuthModule,
    LoansModule,
    ShopsModule,
    TransactionsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
