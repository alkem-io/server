import { QueryRunner } from 'typeorm';

export const alterFKColumnType = async (
  queryRunner: QueryRunner,
  tableName: string,
  columnName: string,
  columnType: string,
  fkTableName: string,
  fkTableIdColumnName: string
) => {
  await queryRunner.query(`
      LOCK TABLES \'${tableName}\' WRITE,\'${fkTableIdColumnName}\' WRITE`);
  await queryRunner.query(
    `ALTER TABLE \'${tableName}\' DROP FOREIGN KEY FK_945b0355b4e9bd6b02c66507a30, MODIFY \'${columnName}\' \'\'${columnType}\'\';`
  );
};
