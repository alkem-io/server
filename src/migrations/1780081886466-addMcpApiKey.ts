import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMcpApiKey1780081886466 implements MigrationInterface {
  name = 'AddMcpApiKey1780081886466';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mcp_api_key" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "keyHash" character varying(128) NOT NULL,
        "name" character varying(128) NOT NULL,
        "description" character varying(512),
        "userId" uuid NOT NULL,
        "scopes" jsonb NOT NULL,
        "expiresAt" TIMESTAMP,
        "lastUsedAt" TIMESTAMP,
        "lastUsedFromIp" character varying(45),
        "isActive" boolean NOT NULL,
        CONSTRAINT "PK_mcp_api_key_id" PRIMARY KEY ("id")
      )`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_mcp_api_key_keyHash" ON "mcp_api_key" ("keyHash")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_mcp_api_key_userId" ON "mcp_api_key" ("userId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mcp_api_key_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mcp_api_key_keyHash"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mcp_api_key"`);
  }
}
