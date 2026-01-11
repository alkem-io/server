import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameInvitedContributorIDToActorId1768050878000
  implements MigrationInterface
{
  name = 'RenameInvitedContributorIDToActorId1768050878000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename column in invitation table
    await queryRunner.query(
      `ALTER TABLE "invitation" RENAME COLUMN "invitedContributorID" TO "invitedActorId"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert column rename
    await queryRunner.query(
      `ALTER TABLE "invitation" RENAME COLUMN "invitedActorId" TO "invitedContributorID"`
    );
  }
}
