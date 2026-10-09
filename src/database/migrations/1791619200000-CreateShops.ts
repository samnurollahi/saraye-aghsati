import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShops1791619200000 implements MigrationInterface {
  name = 'CreateShops1791619200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "shops" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(160) NOT NULL,
        "ownerName" character varying(120) NOT NULL,
        "phone" character varying(11) NOT NULL,
        "address" character varying(500) NOT NULL,
        "description" text,
        "qrCodeToken" character varying(43) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_shops_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_shops_qr_code_token" ON "shops" ("qrCodeToken")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shops_is_active" ON "shops" ("isActive")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_shops_is_active"`);
    await queryRunner.query(`DROP INDEX "UQ_shops_qr_code_token"`);
    await queryRunner.query(`DROP TABLE "shops"`);
  }
}
