import { MigrationInterface, QueryRunner } from 'typeorm';

const tableNames = [
  'user',
  'project',
  'organization',
  'hub',
  'challenge',
  'opportunity',
];

const symbolsToRemove = ['(', ')', '.'];

const buildUnderscoreQuery = (tableName: string) =>
  `update ${tableName} set nameID = LOWER(REPLACE(nameID, '_', '-')) where nameID like '%_%'`;

const buildSymbolRemoveQuery = (tableName: string, symbol: string) =>
  `update ${tableName} set nameID = REPLACE(nameID, '${symbol}', '') where nameID like '%${symbol}%'`;

export class cleanNameids1636110445512 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    tableNames.forEach(async tableName => {
      await queryRunner.query(buildUnderscoreQuery(tableName));
      // remove symbols
      symbolsToRemove.forEach(
        async symbol =>
          await queryRunner.query(buildSymbolRemoveQuery(tableName, symbol))
      );
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // we do not know which nameIDs where incorrect to begin with
  }
}
