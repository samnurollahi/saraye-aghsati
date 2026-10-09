import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoanWorkflow1791532800000 implements MigrationInterface {
  name = 'CreateLoanWorkflow1791532800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "loan_requests_status_enum" AS ENUM ('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "loans_status_enum" AS ENUM ('active', 'completed', 'defaulted')`,
    );
    await queryRunner.query(
      `CREATE TYPE "installments_status_enum" AS ENUM ('pending', 'paid', 'overdue')`,
    );
    await queryRunner.query(`
      CREATE TABLE "loan_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "requestedAmount" numeric NOT NULL,
        "purpose" text NOT NULL,
        "status" "loan_requests_status_enum" NOT NULL DEFAULT 'pending',
        "adminNote" text,
        "reviewedBy" uuid,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_loan_requests_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_loan_requests_reviewer" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_loan_requests_user_id" ON "loan_requests" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_loan_requests_status" ON "loan_requests" ("status")`,
    );
    await queryRunner.query(`
      CREATE TABLE "loans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "loanRequestId" uuid NOT NULL,
        "principalAmount" numeric NOT NULL,
        "interestRate" numeric NOT NULL,
        "totalAmount" numeric NOT NULL,
        "installmentCount" integer NOT NULL,
        "installmentAmount" numeric NOT NULL,
        "startDate" date NOT NULL,
        "status" "loans_status_enum" NOT NULL DEFAULT 'active',
        "remainingBalance" numeric NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loans_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_loans_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_loans_request" FOREIGN KEY ("loanRequestId") REFERENCES "loan_requests"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_loans_loan_request_id" ON "loans" ("loanRequestId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_loans_user_id" ON "loans" ("userId")`,
    );
    await queryRunner.query(`
      CREATE TABLE "installments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "loanId" uuid NOT NULL,
        "installmentNumber" integer NOT NULL,
        "dueDate" date NOT NULL,
        "amount" numeric NOT NULL,
        "status" "installments_status_enum" NOT NULL DEFAULT 'pending',
        "paidAt" TIMESTAMP WITH TIME ZONE,
        "paidConfirmedBy" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_installments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_installments_loan" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_installments_confirmer" FOREIGN KEY ("paidConfirmedBy") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_installments_loan_number" ON "installments" ("loanId", "installmentNumber")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "installments"`);
    await queryRunner.query(`DROP TABLE "loans"`);
    await queryRunner.query(`DROP TABLE "loan_requests"`);
    await queryRunner.query(`DROP TYPE "installments_status_enum"`);
    await queryRunner.query(`DROP TYPE "loans_status_enum"`);
    await queryRunner.query(`DROP TYPE "loan_requests_status_enum"`);
  }
}
