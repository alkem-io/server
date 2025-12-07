import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationArchitectureRefactor1764897584127
  implements MigrationInterface
{
  name = 'ConversationArchitectureRefactor1764897584127';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_user_authenticationID"`);
    await queryRunner.query(
      `CREATE TABLE "conversation_membership" ("conversationId" uuid NOT NULL, "agentId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_42dca6e5549063cb4cee1ee1308" PRIMARY KEY ("conversationId", "agentId"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d348791d10e1f31c61d7f5bd2a" ON "conversation_membership" ("agentId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_285a9958dbcd10748d4470054d" ON "conversation_membership" ("conversationId") `
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD "wellKnownVirtualContributor" character varying(128)`
    );
    await queryRunner.query(`ALTER TABLE "conversation" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "conversation" DROP COLUMN "userID"`);
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN "virtualContributorID"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN "wellKnownVirtualContributor"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_0742ec75e9fc10a1e393a3ef4c7" UNIQUE ("authenticationID")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0742ec75e9fc10a1e393a3ef4c" ON "user" ("authenticationID") `
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" ADD CONSTRAINT "FK_285a9958dbcd10748d4470054d5" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" ADD CONSTRAINT "FK_d348791d10e1f31c61d7f5bd2a7" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" DROP CONSTRAINT "FK_d348791d10e1f31c61d7f5bd2a7"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" DROP CONSTRAINT "FK_285a9958dbcd10748d4470054d5"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0742ec75e9fc10a1e393a3ef4c"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_0742ec75e9fc10a1e393a3ef4c7"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "wellKnownVirtualContributor" character varying(128)`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "virtualContributorID" uuid`
    );
    await queryRunner.query(`ALTER TABLE "conversation" ADD "userID" uuid`);
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "type" character varying(128) NOT NULL DEFAULT 'user-user'`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP COLUMN "wellKnownVirtualContributor"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_285a9958dbcd10748d4470054d"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d348791d10e1f31c61d7f5bd2a"`
    );
    await queryRunner.query(`DROP TABLE "conversation_membership"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_authenticationID" ON "user" ("authenticationID") `
    );
  }
}
