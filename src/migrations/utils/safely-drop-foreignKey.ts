import { QueryRunner } from 'typeorm';

export const safelyDropFK = async (
  queryRunner: QueryRunner,
  tableName: string,
  foreignKey: string
) => {
  const result = await queryRunner.query(
    `
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = ?
    AND CONSTRAINT_NAME = ?
    `,
    [tableName, foreignKey]
  );

  if (result && result.length && result.length > 0) {
    await queryRunner.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${foreignKey}\``
    );
  }
};
