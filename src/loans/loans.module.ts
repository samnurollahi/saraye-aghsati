import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Installment } from './entities/installment.entity';
import { Loan } from './entities/loan.entity';
import { LoanRequest } from './entities/loan-request.entity';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanRequest, Loan, Installment]),
    AuthModule,
  ],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
