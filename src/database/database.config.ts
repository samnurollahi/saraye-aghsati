import { DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { InitialUsers1791446400000 } from './migrations/1791446400000-InitialUsers';
import { CreateLoanWorkflow1791532800000 } from './migrations/1791532800000-CreateLoanWorkflow';
import { LoanRequest } from '../loans/entities/loan-request.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Installment } from '../loans/entities/installment.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CreateShops1791619200000 } from './migrations/1791619200000-CreateShops';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CreateTransactions1791705600000 } from './migrations/1791705600000-CreateTransactions';
import { Notification } from '../notifications/entities/notification.entity';
import { CreateNotifications1791792000000 } from './migrations/1791792000000-CreateNotifications';
import { config } from 'dotenv';

config();

export function buildDatabaseOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.PGHOST ?? '127.0.0.1',
    port: Number(env.PGPORT ?? 5432),
    username: env.PGUSER ?? 'postgres',
    password: env.PGPASSWORD ?? 'express',
    database: env.PGDATABASE ?? 'loan_system',
    entities: [
      User,
      LoanRequest,
      Loan,
      Installment,
      Shop,
      Transaction,
      Notification,
    ],
    migrations: [
      InitialUsers1791446400000,
      CreateLoanWorkflow1791532800000,
      CreateShops1791619200000,
      CreateTransactions1791705600000,
      CreateNotifications1791792000000,
    ],
    synchronize: false,
    migrationsRun: false,
  };
}
