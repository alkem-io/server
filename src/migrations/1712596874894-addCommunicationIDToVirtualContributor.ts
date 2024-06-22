import { MigrationInterface, QueryRunner } from 'typeorm';

export class addCommunicationIDToVirtualContributor1712596874894
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`communicationID\` varchar(255) NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`communicationID\``
    );
  }
}
