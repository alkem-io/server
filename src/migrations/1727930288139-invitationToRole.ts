import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvitationToRole1727930288139 implements MigrationInterface {
  name = 'InvitationToRole1727930288139';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`extraRole\` varchar(128) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`FK_562dce4a08bb214f08107b3631e\` ON \`platform_invitation\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` CHANGE \`invitedContributor\` \`invitedContributorID\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_562dce4a08bb214f08107b3631e\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`extraRole\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_562dce4a08bb214f08107b3631e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` CHANGE \`invitedContributorID\` \`invitedContributor\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `CREATE INDEX \`FK_562dce4a08bb214f08107b3631e\` ON \`platform_invitation\` (\`roleSetId\`)`
    );
  }
}
