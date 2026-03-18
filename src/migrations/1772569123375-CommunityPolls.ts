import { MigrationInterface, QueryRunner } from "typeorm";

export class CommunityPolls1772569123375 implements MigrationInterface {
  name = 'CommunityPolls1772569123375'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "poll_option" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT now(), "version" integer NOT NULL, "text" character varying(512) NOT NULL, "sortOrder" integer NOT NULL, "pollId" uuid NOT NULL, CONSTRAINT "UQ_498bbf02ebeb7a9017866813347" UNIQUE ("pollId", "sortOrder"), CONSTRAINT "PK_5fdd46d449ddcc8201aed9b5a1b" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "poll_vote" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT now(), "version" integer NOT NULL, "createdBy" uuid NOT NULL, "selectedOptionIds" jsonb NOT NULL, "pollId" uuid NOT NULL, CONSTRAINT "UQ_c3a1e0d8319f92349a8eafc4d5f" UNIQUE ("createdBy", "pollId"), CONSTRAINT "PK_fd002d371201c472490ba89c6a0" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "poll" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT now(), "version" integer NOT NULL, "title" character varying(512) NOT NULL, "status" character varying(128) NOT NULL, "settings" jsonb NOT NULL, "deadline" TIMESTAMPTZ, "authorizationId" uuid, CONSTRAINT "REL_0f5c276b165d753be456719497" UNIQUE ("authorizationId"), CONSTRAINT "PK_03b5cf19a7f562b231c3458527e" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "callout_framing" ADD "pollId" uuid`);
    await queryRunner.query(`ALTER TABLE "callout_framing" ADD CONSTRAINT "UQ_1befc5c804ba6c5eb3eb713282e" UNIQUE ("pollId")`);
    await queryRunner.query(`ALTER TABLE "poll_option" ADD CONSTRAINT "FK_a1200fcfcdab6145351545f26ea" FOREIGN KEY ("pollId") REFERENCES "poll"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "poll_vote" ADD CONSTRAINT "FK_99f9db6d3dae2a0aebebbf8e10a" FOREIGN KEY ("pollId") REFERENCES "poll"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    // ON DELETE CASCADE: when a user is deleted, their votes are silently removed. This is intentional.
    await queryRunner.query(`ALTER TABLE "poll_vote" ADD CONSTRAINT "FK_66e630ffddf3da89979811fe739" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "poll" ADD CONSTRAINT "FK_0f5c276b165d753be4567194977" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_1befc5c804ba6c5eb3eb713282e" FOREIGN KEY ("pollId") REFERENCES "poll"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`CREATE INDEX "IDX_a1200fcfcdab6145351545f26e" ON "poll_option" ("pollId") `);
    await queryRunner.query(`CREATE INDEX "IDX_99f9db6d3dae2a0aebebbf8e10" ON "poll_vote" ("pollId") `);

    // Backfill poll notification preferences
    await queryRunner.query(`
      UPDATE "user_settings"
      SET "notification" = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                "notification",
                '{space}',
                COALESCE("notification"->'space', '{}'::jsonb),
                true
              ),
              '{space,collaborationPollVoteCastOnOwnPoll}',
              COALESCE(
                "notification" #> '{space,collaborationPollVoteCastOnOwnPoll}',
                '{"email": false, "inApp": true}'::jsonb
              ),
              true
            ),
            '{space,collaborationPollVoteCastOnPollIVotedOn}',
            COALESCE(
              "notification" #> '{space,collaborationPollVoteCastOnPollIVotedOn}',
              '{"email": false, "inApp": true}'::jsonb
            ),
            true
          ),
          '{space,collaborationPollModifiedOnPollIVotedOn}',
          COALESCE(
            "notification" #> '{space,collaborationPollModifiedOnPollIVotedOn}',
            '{"email": false, "inApp": true}'::jsonb
          ),
          true
        ),
        '{space,collaborationPollVoteAffectedByOptionChange}',
        COALESCE(
          "notification" #> '{space,collaborationPollVoteAffectedByOptionChange}',
          '{"email": false, "inApp": true}'::jsonb
        ),
        true
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_99f9db6d3dae2a0aebebbf8e10"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a1200fcfcdab6145351545f26e"`);
    await queryRunner.query(`ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_1befc5c804ba6c5eb3eb713282e"`);
    await queryRunner.query(`ALTER TABLE "poll" DROP CONSTRAINT "FK_0f5c276b165d753be4567194977"`);
    await queryRunner.query(`ALTER TABLE "poll_vote" DROP CONSTRAINT "FK_66e630ffddf3da89979811fe739"`);
    await queryRunner.query(`ALTER TABLE "poll_vote" DROP CONSTRAINT "FK_99f9db6d3dae2a0aebebbf8e10a"`);
    await queryRunner.query(`ALTER TABLE "poll_option" DROP CONSTRAINT "FK_a1200fcfcdab6145351545f26ea"`);
    await queryRunner.query(`ALTER TABLE "callout_framing" DROP CONSTRAINT "UQ_1befc5c804ba6c5eb3eb713282e"`);
    await queryRunner.query(`ALTER TABLE "callout_framing" DROP COLUMN "pollId"`);
    await queryRunner.query(`DROP TABLE "poll"`);
    await queryRunner.query(`DROP TABLE "poll_vote"`);
    await queryRunner.query(`DROP TABLE "poll_option"`);
    await queryRunner.query(`
      UPDATE "user_settings"
      SET "notification" =
        "notification"
          #- '{space,collaborationPollVoteCastOnOwnPoll}'
          #- '{space,collaborationPollVoteCastOnPollIVotedOn}'
          #- '{space,collaborationPollModifiedOnPollIVotedOn}'
          #- '{space,collaborationPollVoteAffectedByOptionChange}';
    `);
  }
}
