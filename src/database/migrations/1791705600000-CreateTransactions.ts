import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactions1791705600000 implements MigrationInterface {
  name = 'CreateTransactions1791705600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "transactions_status_enum" AS ENUM ('completed', 'failed')`,
    );
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "loanId" uuid NOT NULL,
        "shopId" uuid NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "description" character varying(500),
        "status" "transactions_status_enum" NOT NULL DEFAULT 'completed',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_transactions_loan" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_transactions_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_transactions_amount_positive" CHECK ("amount" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_user_created_at" ON "transactions" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_loan_id" ON "transactions" ("loanId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_shop_id" ON "transactions" ("shopId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_status" ON "transactions" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_transactions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_shop_id"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_loan_id"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_user_created_at"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "transactions_status_enum"`);
  }
}
