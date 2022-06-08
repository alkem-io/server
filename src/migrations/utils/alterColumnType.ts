import { QueryRunner } from 'typeorm';

export const alterColumnType = async (
  queryRunner: QueryRunner,
  tableName: string,
  columnName: string,
  columnType: string
) => {
  await queryRunner.query(
    `ALTER TABLE \`${tableName}\` MODIFY \`${columnName}\` ${columnType}`
  );
};
