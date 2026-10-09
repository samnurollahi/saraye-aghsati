import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1791792000000 implements MigrationInterface {
  name = 'CreateNotifications1791792000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "notifications_type_enum" AS ENUM ('INSTALLMENT_DUE_SOON', 'INSTALLMENT_DUE', 'INSTALLMENT_OVERDUE')`,
    );
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "installmentId" uuid NOT NULL,
        "type" "notifications_type_enum" NOT NULL,
        "title" character varying(200) NOT NULL,
        "message" character varying(500) NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_notifications_installment" FOREIGN KEY ("installmentId") REFERENCES "installments"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_notifications_installment_type" ON "notifications" ("installmentId", "type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_read_created" ON "notifications" ("userId", "isRead", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_installments_status_due_date" ON "installments" ("status", "dueDate")`,
    );
    await queryRunner.query(`
      UPDATE "loans"
      SET "status" = 'active'
      WHERE "status" = 'completed'
        AND EXISTS (
          SELECT 1
          FROM "installments"
          WHERE "installments"."loanId" = "loans"."id"
            AND "installments"."status" <> 'paid'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_installments_status_due_date"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_user_read_created"`);
    await queryRunner.query(`DROP INDEX "UQ_notifications_installment_type"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notifications_type_enum"`);
  }
}
