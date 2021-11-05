import { MigrationInterface, QueryRunner } from 'typeorm';

const tableNames = [
  'user',
  'project',
  'organization',
  'ecoverse',
  'challenge',
  'opportunity',
];

const buildQuery = (tableName: string) =>
  `update ${tableName} set nameID = LOWER(REPLACE(nameID, '_', '-')) where nameID like '%_%'`;

export class cleanNameids1636110445512 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    tableNames.forEach(async x => await queryRunner.query(buildQuery(x)));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // we do not know which nameIDs where incorrect to begin with
  }
}
