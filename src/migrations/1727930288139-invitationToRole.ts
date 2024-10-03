import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvitationToRole1727930288139 implements MigrationInterface {
  name = 'InvitationToRole1727930288139';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD \`extraRole\` varchar(128) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP COLUMN \`extraRole\``
    );
  }
}
