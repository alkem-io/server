import { MigrationInterface, QueryRunner } from 'typeorm';

export class communityGuidelinesTemplate1715339702424
  implements MigrationInterface
{
  name = 'communityGuidelinesTemplate1715339702424';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`community_guidelines_template\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` char(36) NULL, \`profileId\` char(36) NULL, \`templatesSetId\` char(36) NULL, UNIQUE INDEX \`REL_01e7bc325ec00e0a2293c6cb86\` (\`authorizationId\`), UNIQUE INDEX \`REL_60a5db7dbecd605f37ece4b4d8\` (\`profileId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD CONSTRAINT \`FK_01e7bc325ec00e0a2293c6cb86d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD CONSTRAINT \`FK_60a5db7dbecd605f37ece4b4d86\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` ADD CONSTRAINT \`FK_9ddb1958500a40bf465cf265732\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP FOREIGN KEY \`FK_9ddb1958500a40bf465cf265732\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP FOREIGN KEY \`FK_60a5db7dbecd605f37ece4b4d86\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community_guidelines_template\` DROP FOREIGN KEY \`FK_01e7bc325ec00e0a2293c6cb86d\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_60a5db7dbecd605f37ece4b4d8\` ON \`community_guidelines_template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_01e7bc325ec00e0a2293c6cb86\` ON \`community_guidelines_template\``
    );
    await queryRunner.query(`DROP TABLE \`community_guidelines_template\``);
  }
}
