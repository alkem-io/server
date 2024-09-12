import { QueryRunner } from 'typeorm';

export const safelyDropIndex = async (
  queryRunner: QueryRunner,
  tableName: string,
  indexName: string
) => {
  // Step 1: Check if the index exists
  const indexResult = await queryRunner.query(
    `
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = ?
    AND INDEX_NAME = ?
    `,
    [tableName, indexName]
  );

  if (indexResult && indexResult.length > 0) {
    // Step 2: Check if any column of the index is used in a foreign key constraint
    const fkResult = await queryRunner.query(
      `
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME IN (
        SELECT COLUMN_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      )
      AND CONSTRAINT_NAME IN (
        SELECT CONSTRAINT_NAME
        FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE TABLE_NAME = ?
      )
      `,
      [tableName, tableName, indexName, tableName]
    );

    // Step 3: If no foreign key constraint uses the index, drop the index
    if (!fkResult || fkResult.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``
      );
    } else {
      console.log(
        `Index \`${indexName}\` is part of a foreign key constraint and cannot be dropped.`
      );
    }
  } else {
    console.log(`Index \`${indexName}\` does not exist.`);
  }
};
