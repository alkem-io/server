import { MigrationInterface, QueryRunner } from 'typeorm';

export class createInteraction1720510767439 implements MigrationInterface {
  name = 'createInteraction1720510767439';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`vc_interaction\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`threadID\` varchar(128) NOT NULL, \`virtualContributorID\` char(36) NOT NULL, \`roomId\` char(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` ADD CONSTRAINT \`FK_1ba25e7d3dc29fa02b88e17fca0\` FOREIGN KEY (\`roomId\`) REFERENCES \`room\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` DROP FOREIGN KEY \`FK_1ba25e7d3dc29fa02b88e17fca0\``
    );
    await queryRunner.query(`DROP TABLE \`vc_interaction\``);
  }
}
