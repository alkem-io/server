import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignConstraintNamesWithTypeORM1772640100000
  implements MigrationInterface
{
  name = 'AlignConstraintNamesWithTypeORM1772640100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===================================================================
    // #2: Rename hand-written FK/index names to TypeORM auto-generated names
    //     so future migration:generate runs produce clean diffs.
    // ===================================================================

    // --- Foreign Keys ---

    // credential.actorId → actor.id
    await queryRunner.query(
      `ALTER TABLE "credential" DROP CONSTRAINT "FK_credential_actorId"`
    );
    await queryRunner.query(
      `ALTER TABLE "credential" ADD CONSTRAINT "FK_f4a4d364457d7cb4c31a0a64b58" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // actor.authorizationId → authorization_policy.id
    await queryRunner.query(
      `ALTER TABLE "actor" DROP CONSTRAINT "FK_actor_authorizationId"`
    );
    await queryRunner.query(
      `ALTER TABLE "actor" ADD CONSTRAINT "FK_a2afa3851ea733de932251b3a1f" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // actor.profileId → profile.id
    await queryRunner.query(
      `ALTER TABLE "actor" DROP CONSTRAINT "FK_actor_profileId"`
    );
    await queryRunner.query(
      `ALTER TABLE "actor" ADD CONSTRAINT "FK_5b434d551bb69f49f3beb53955d" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // user.id → actor.id
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_user_actor_id"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_cace4a159ff9f2512dd42373760" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // invitation.invitedActorId → actor.id
    await queryRunner.query(
      `ALTER TABLE "invitation" DROP CONSTRAINT "FK_invitation_invitedActorId"`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" ADD CONSTRAINT "FK_3901850cc35d37a2f47c119cae6" FOREIGN KEY ("invitedActorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // organization.id → actor.id
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_organization_actor_id"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_472c1f99a32def1b0abb219cd67" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // space.id → actor.id
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_space_actor_id"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_094f5ec727fe052956a11623640" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // virtual_contributor.id → actor.id
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP CONSTRAINT "FK_virtual_contributor_actor_id"`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD CONSTRAINT "FK_b81a1ab0eb4d1a0dfeec54faf0b" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // account.id → actor.id
    await queryRunner.query(
      `ALTER TABLE "account" DROP CONSTRAINT "FK_account_actor_id"`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "FK_54115ee388cdb6d86bb4bf5b2ea" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // in_app_notification.contributorActorId → actor.id
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_notification_contributor_actor"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_48cd51e911d1d7e13661ba4a05b" FOREIGN KEY ("contributorActorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // conversation_membership.actorId → actor.id
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" DROP CONSTRAINT "FK_conversation_membership_actorId"`
    );
    // TypeORM does not generate an explicit FK for conversation_membership.actorId
    // (it's a composite PK member without @ManyToOne to actor), so just drop the old one.

    // --- Indexes ---

    await queryRunner.query(
      `DROP INDEX "public"."IDX_credential_actorId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_actor_profileId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_in_app_notification_contributorActorId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_conversation_membership_actorId"`
    );

    // TypeORM auto-generates this index name for conversation_membership.actorId
    await queryRunner.query(
      `CREATE INDEX "IDX_01cf61a0048fa466394a9e47c2" ON "conversation_membership" ("actorId")`
    );

    // Note: IDX_actor_type and UQ_actor_nameID_* are partial/conditional indexes
    // managed by hand-written migrations. TypeORM does not auto-generate these
    // (they use WHERE clauses), so they stay as-is.

    // ===================================================================
    // #6: Add missing FK for invitation.createdBy → actor.id
    // ===================================================================
    await queryRunner.query(
      `ALTER TABLE "invitation" ADD CONSTRAINT "FK_82cb26926bb13032087af2b116a" FOREIGN KEY ("createdBy") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // ===================================================================
    // #7: Add missing UNIQUE constraints on actor.authorizationId and actor.profileId
    // ===================================================================
    await queryRunner.query(
      `ALTER TABLE "actor" ADD CONSTRAINT "UQ_a2afa3851ea733de932251b3a1f" UNIQUE ("authorizationId")`
    );
    await queryRunner.query(
      `ALTER TABLE "actor" ADD CONSTRAINT "UQ_5b434d551bb69f49f3beb53955d" UNIQUE ("profileId")`
    );

    // ===================================================================
    // #8: Drop stale DEFAULT 1 from actor.version
    //     All other tables use @VersionColumn() with no DB-level default.
    // ===================================================================
    await queryRunner.query(
      `ALTER TABLE "actor" ALTER COLUMN "version" DROP DEFAULT`
    );

    // ===================================================================
    // #5: Add column comment for in_app_notification.contributorActorId
    // ===================================================================
    await queryRunner.query(
      `COMMENT ON COLUMN "in_app_notification"."contributorActorId" IS 'FK to Actor - cascade deletes notification when contributor is deleted'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove comment
    await queryRunner.query(
      `COMMENT ON COLUMN "in_app_notification"."contributorActorId" IS NULL`
    );

    // Restore actor.version DEFAULT
    await queryRunner.query(
      `ALTER TABLE "actor" ALTER COLUMN "version" SET DEFAULT '1'`
    );

    // Remove unique constraints
    await queryRunner.query(
      `ALTER TABLE "actor" DROP CONSTRAINT "UQ_5b434d551bb69f49f3beb53955d"`
    );
    await queryRunner.query(
      `ALTER TABLE "actor" DROP CONSTRAINT "UQ_a2afa3851ea733de932251b3a1f"`
    );

    // Remove invitation.createdBy FK
    await queryRunner.query(
      `ALTER TABLE "invitation" DROP CONSTRAINT "FK_82cb26926bb13032087af2b116a"`
    );

    // Restore indexes
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01cf61a0048fa466394a9e47c2"`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_membership_actorId" ON "conversation_membership" ("actorId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_in_app_notification_contributorActorId" ON "in_app_notification" ("contributorActorId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_actor_profileId" ON "actor" ("profileId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_credential_actorId" ON "credential" ("actorId")`
    );

    // Restore FKs with original names
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" ADD CONSTRAINT "FK_conversation_membership_actorId" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" DROP CONSTRAINT "FK_48cd51e911d1d7e13661ba4a05b"`
    );
    await queryRunner.query(
      `ALTER TABLE "in_app_notification" ADD CONSTRAINT "FK_notification_contributor_actor" FOREIGN KEY ("contributorActorId") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP CONSTRAINT "FK_54115ee388cdb6d86bb4bf5b2ea"`
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "FK_account_actor_id" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP CONSTRAINT "FK_b81a1ab0eb4d1a0dfeec54faf0b"`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD CONSTRAINT "FK_virtual_contributor_actor_id" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP CONSTRAINT "FK_094f5ec727fe052956a11623640"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" ADD CONSTRAINT "FK_space_actor_id" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_472c1f99a32def1b0abb219cd67"`
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_organization_actor_id" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" DROP CONSTRAINT "FK_3901850cc35d37a2f47c119cae6"`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" ADD CONSTRAINT "FK_invitation_invitedActorId" FOREIGN KEY ("invitedActorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_cace4a159ff9f2512dd42373760"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_user_actor_id" FOREIGN KEY ("id") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "actor" DROP CONSTRAINT "FK_5b434d551bb69f49f3beb53955d"`
    );
    await queryRunner.query(
      `ALTER TABLE "actor" ADD CONSTRAINT "FK_actor_profileId" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "actor" DROP CONSTRAINT "FK_a2afa3851ea733de932251b3a1f"`
    );
    await queryRunner.query(
      `ALTER TABLE "actor" ADD CONSTRAINT "FK_actor_authorizationId" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "credential" DROP CONSTRAINT "FK_f4a4d364457d7cb4c31a0a64b58"`
    );
    await queryRunner.query(
      `ALTER TABLE "credential" ADD CONSTRAINT "FK_credential_actorId" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }
}
