import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1771000016000 renamed invitedContributorID → invitedActorId but
 * did not add a FK constraint to the actor table. This migration adds the
 * missing constraint, matching the entity definition:
 *   @ManyToOne(() => Actor, { onDelete: 'CASCADE' })
 *
 * Orphaned rows (invitedActorId referencing a non-existent actor) are deleted
 * before the constraint is added to avoid FK violations.
 */
export class AddFkInvitedActorIdToActor1771000019000
  implements MigrationInterface
{
  name = 'AddFkInvitedActorIdToActor1771000019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove orphaned invitations whose invitedActorId no longer exists
    await queryRunner.query(`
      DELETE FROM "invitation"
      WHERE "invitedActorId" NOT IN (SELECT "id" FROM "actor")
    `);

    await queryRunner.query(`
      ALTER TABLE "invitation"
      ADD CONSTRAINT "FK_invitation_invitedActorId"
      FOREIGN KEY ("invitedActorId")
      REFERENCES "actor"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invitation"
      DROP CONSTRAINT IF EXISTS "FK_invitation_invitedActorId"
    `);
  }
}
