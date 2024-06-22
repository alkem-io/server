import { MigrationInterface, QueryRunner } from 'typeorm';

export class subspaceInvitations1715874015062 implements MigrationInterface {
  name = 'subspaceInvitations1715874015062';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`invitedToParent\` tinyint NOT NULL DEFAULT 0`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` ADD \`invitedToParent\` tinyint NOT NULL DEFAULT 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` DROP COLUMN \`invitedToParent\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`invitedToParent\``
    );
  }
}
