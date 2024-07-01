import { MigrationInterface, QueryRunner } from 'typeorm';

export class contributorCommunicationID1719487568442
  implements MigrationInterface
{
  name = 'contributorCommunicationID1719487568442';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `organization` ADD `communicationID` varchar(255) NOT NULL'
    );
    await queryRunner.query(`UPDATE organization SET communicationID = ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
