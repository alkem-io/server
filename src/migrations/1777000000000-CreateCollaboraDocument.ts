import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCollaboraDocument1776142609192 implements MigrationInterface {
    name = 'CreateCollaboraDocument1776142609192'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "push_subscription" DROP CONSTRAINT "FK_push_subscription_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_push_subscription_userId_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_push_subscription_endpoint"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_01cf61a0048fa466394a9e47c2c"`);
        await queryRunner.query(`CREATE TABLE "collabora_document" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "documentType" character varying(128) NOT NULL, "createdBy" uuid, "authorizationId" uuid, "profileId" uuid, "documentId" uuid, CONSTRAINT "REL_3f8c429460dfb60946fb2ea697" UNIQUE ("authorizationId"), CONSTRAINT "REL_180cd4e73943f2eb8016fd7c71" UNIQUE ("profileId"), CONSTRAINT "PK_c3f8d423d641ce7fa09b047212e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "callout_contribution" ADD "collaboraDocumentId" uuid`);
        await queryRunner.query(`ALTER TABLE "callout_contribution" ADD CONSTRAINT "UQ_2d3269074b75ecd278858d8b6c9" UNIQUE ("collaboraDocumentId")`);
        await queryRunner.query(`ALTER TYPE "public"."profile_type_enum" RENAME TO "profile_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."profile_type_enum" AS ENUM('space-about', 'innovation-flow', 'callout-framing', 'knowledge-base', 'post', 'contribution-link', 'whiteboard', 'memo', 'discussion', 'organization', 'user-group', 'user', 'innovation-hub', 'calendar-event', 'innovation-pack', 'template', 'community-guidelines', 'virtual-contributor', 'virtual-persona', 'space', 'account', 'collabora-document')`);
        await queryRunner.query(`ALTER TABLE "profile" ALTER COLUMN "type" TYPE "public"."profile_type_enum" USING "type"::"text"::"public"."profile_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."profile_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invitation" DROP CONSTRAINT "FK_82cb26926bb13032087af2b116a"`);
        await queryRunner.query(`ALTER TABLE "invitation" ALTER COLUMN "createdBy" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "push_subscription" ALTER COLUMN "version" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "push_subscription" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "conversation" DROP CONSTRAINT "FK_c3eb45de493217a6d0e225028fa"`);
        await queryRunner.query(`ALTER TABLE "conversation" ALTER COLUMN "roomId" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_01cf61a0048fa466394a9e47c2" ON "conversation_membership" ("actorId") `);
        await queryRunner.query(`ALTER TABLE "invitation" ADD CONSTRAINT "FK_82cb26926bb13032087af2b116a" FOREIGN KEY ("createdBy") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "push_subscription" ADD CONSTRAINT "FK_8a227cbc3dc43c0d56117ea1563" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collabora_document" ADD CONSTRAINT "FK_3f8c429460dfb60946fb2ea6973" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collabora_document" ADD CONSTRAINT "FK_180cd4e73943f2eb8016fd7c71e" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collabora_document" ADD CONSTRAINT "FK_8197b90a8fb52b11224cf82afd8" FOREIGN KEY ("documentId") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "callout_contribution" ADD CONSTRAINT "FK_2d3269074b75ecd278858d8b6c9" FOREIGN KEY ("collaboraDocumentId") REFERENCES "collabora_document"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation" ADD CONSTRAINT "FK_c3eb45de493217a6d0e225028fa" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversation" DROP CONSTRAINT "FK_c3eb45de493217a6d0e225028fa"`);
        await queryRunner.query(`ALTER TABLE "callout_contribution" DROP CONSTRAINT "FK_2d3269074b75ecd278858d8b6c9"`);
        await queryRunner.query(`ALTER TABLE "collabora_document" DROP CONSTRAINT "FK_8197b90a8fb52b11224cf82afd8"`);
        await queryRunner.query(`ALTER TABLE "collabora_document" DROP CONSTRAINT "FK_180cd4e73943f2eb8016fd7c71e"`);
        await queryRunner.query(`ALTER TABLE "collabora_document" DROP CONSTRAINT "FK_3f8c429460dfb60946fb2ea6973"`);
        await queryRunner.query(`ALTER TABLE "push_subscription" DROP CONSTRAINT "FK_8a227cbc3dc43c0d56117ea1563"`);
        await queryRunner.query(`ALTER TABLE "invitation" DROP CONSTRAINT "FK_82cb26926bb13032087af2b116a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_01cf61a0048fa466394a9e47c2"`);
        await queryRunner.query(`ALTER TABLE "conversation" ALTER COLUMN "roomId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "conversation" ADD CONSTRAINT "FK_c3eb45de493217a6d0e225028fa" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "push_subscription" ALTER COLUMN "status" SET DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "push_subscription" ALTER COLUMN "version" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "invitation" ALTER COLUMN "createdBy" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invitation" ADD CONSTRAINT "FK_82cb26926bb13032087af2b116a" FOREIGN KEY ("createdBy") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TYPE "public"."profile_type_enum_old" AS ENUM('space-about', 'innovation-flow', 'callout-framing', 'knowledge-base', 'post', 'contribution-link', 'whiteboard', 'memo', 'discussion', 'organization', 'user-group', 'user', 'innovation-hub', 'calendar-event', 'innovation-pack', 'template', 'community-guidelines', 'virtual-contributor', 'virtual-persona', 'space', 'account')`);
        await queryRunner.query(`ALTER TABLE "profile" ALTER COLUMN "type" TYPE "public"."profile_type_enum_old" USING "type"::"text"::"public"."profile_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."profile_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."profile_type_enum_old" RENAME TO "profile_type_enum"`);
        await queryRunner.query(`ALTER TABLE "callout_contribution" DROP CONSTRAINT "UQ_2d3269074b75ecd278858d8b6c9"`);
        await queryRunner.query(`ALTER TABLE "callout_contribution" DROP COLUMN "collaboraDocumentId"`);
        await queryRunner.query(`DROP TABLE "collabora_document"`);
        await queryRunner.query(`CREATE INDEX "IDX_01cf61a0048fa466394a9e47c2c" ON "conversation_membership" ("actorId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_push_subscription_endpoint" ON "push_subscription" ("endpoint") `);
        await queryRunner.query(`CREATE INDEX "IDX_push_subscription_userId_status" ON "push_subscription" ("status", "userId") `);
        await queryRunner.query(`ALTER TABLE "push_subscription" ADD CONSTRAINT "FK_push_subscription_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
