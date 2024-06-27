import { MigrationInterface, QueryRunner } from 'typeorm';

export class platformInvitations1719431685862 implements MigrationInterface {
  name = 'platformInvitations1719431685862';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE invitation_external RENAME TO platform_invitation`
    );

    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD \`platformId\` char(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_809c1e6cf3ef6be03a0a1db3f70\` FOREIGN KEY (\`platformId\`) REFERENCES \`platform\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD \`platformRole\` varchar(255) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` RENAME COLUMN \`invitedToParent\` TO \`communityInvitedToParent\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
