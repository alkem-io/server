import { MigrationInterface, QueryRunner } from 'typeorm';

export class activity1662128944732 implements MigrationInterface {
  name = 'activity1662128944732';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`activity\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`triggeredBy\` varchar(36) NULL, \`collaborationID\` varchar(36) NULL, \`resourceID\` varchar(36) NULL, \`description\` varchar(255) NOT NULL, \`type\` varchar(128) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `activity`');
  }
}
