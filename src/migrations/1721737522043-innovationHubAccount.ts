import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationHubAccount1721737522043 implements MigrationInterface {
  name = 'InnovationHubAccount1721737522043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD \`listedInStore\` tinyint NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD \`searchVisibility\` varchar(36) NOT NULL DEFAULT 'account'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
