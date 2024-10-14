import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvitationCommunityExtraRole1728936661201
  implements MigrationInterface
{
  name = 'InvitationCommunityExtraRole1728936661201';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn(
      'platform_invitation',
      'communityInvitedToParent',
      'roleSetInvitedToParent'
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD \`roleSetExtraRole\` varchar(128) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn(
      'platform_invitation',
      'roleSetInvitedToParent',
      'communityInvitedToParent'
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP COLUMN \`roleSetExtraRole\``
    );
  }
}
