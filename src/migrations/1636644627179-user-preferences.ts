import { MigrationInterface, QueryRunner } from 'typeorm';

export class userPreferences1636644627179 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`alkemio\`.\`user_preference_definition\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`group\` varchar(255) NOT NULL, \`displayName\` varchar(255) NOT NULL, \`description\` varchar(255) NOT NULL, \`valueType\` varchar(255) NOT NULL, \`type\` varchar(255) NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_4cc4f80e47686c868424a530ee\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`alkemio\`.\`user_preference\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`value\` varchar(255) NOT NULL, \`authorizationId\` char(36) NULL, \`userPreferenceDefinitionId\` char(36) NULL, \`userId\` char(36) NULL, UNIQUE INDEX \`REL_49030bc57aa0f319cee7996fca\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`alkemio\`.\`user_preference_definition\` ADD CONSTRAINT \`FK_4cc4f80e47686c868424a530eef\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`alkemio\`.\`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`alkemio\`.\`user_preference\` ADD CONSTRAINT \`FK_49030bc57aa0f319cee7996fca1\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`alkemio\`.\`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`alkemio\`.\`user_preference\` ADD CONSTRAINT \`FK_650fb4e564a8b4b4ac344270744\` FOREIGN KEY (\`userPreferenceDefinitionId\`) REFERENCES \`alkemio\`.\`user_preference_definition\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`alkemio\`.\`user_preference\` ADD CONSTRAINT \`FK_5b141fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`userId\`) REFERENCES \`alkemio\`.\`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`alkemio\`.\`user_preference\` DROP FOREIGN KEY \`FK_5b141fbd1fef95a0540f7e7d1e2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`alkemio\`.\`user_preference\` DROP FOREIGN KEY \`FK_650fb4e564a8b4b4ac344270744\``
    );
    await queryRunner.query(
      `ALTER TABLE \`alkemio\`.\`user_preference\` DROP FOREIGN KEY \`FK_49030bc57aa0f319cee7996fca1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`alkemio\`.\`user_preference_definition\` DROP FOREIGN KEY \`FK_4cc4f80e47686c868424a530eef\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_49030bc57aa0f319cee7996fca\` ON \`alkemio\`.\`user_preference\``
    );
    await queryRunner.query(`DROP TABLE \`alkemio\`.\`user_preference\``);
    await queryRunner.query(
      `DROP INDEX \`REL_4cc4f80e47686c868424a530ee\` ON \`alkemio\`.\`user_preference_definition\``
    );
    await queryRunner.query(
      `DROP TABLE \`alkemio\`.\`user_preference_definition\``
    );
  }
}
