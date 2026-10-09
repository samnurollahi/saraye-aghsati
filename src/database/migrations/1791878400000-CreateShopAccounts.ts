import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShopAccounts1791878400000 implements MigrationInterface {
  name = 'CreateShopAccounts1791878400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "shop_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "shopId" uuid NOT NULL,
        "loginPhone" character varying(11) NOT NULL,
        "passwordHash" character varying(255),
        "refreshTokenHash" character varying(64),
        "setupTokenHash" character varying(64),
        "setupTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shop_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shop_accounts_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_shop_accounts_shop_id" ON "shop_accounts" ("shopId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_shop_accounts_login_phone" ON "shop_accounts" ("loginPhone")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_shop_accounts_setup_token_hash" ON "shop_accounts" ("setupTokenHash") WHERE "setupTokenHash" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_shop_accounts_setup_token_hash"`);
    await queryRunner.query(`DROP INDEX "UQ_shop_accounts_login_phone"`);
    await queryRunner.query(`DROP INDEX "UQ_shop_accounts_shop_id"`);
    await queryRunner.query(`DROP TABLE "shop_accounts"`);
  }
}
