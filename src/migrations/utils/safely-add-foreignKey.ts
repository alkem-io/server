import { QueryRunner } from 'typeorm';

export const safelyAddFK = async (
  queryRunner: QueryRunner,
  tableName: string,
  foreignKeyName: string,
  columnName: string,
  referencedTableName: string,
  referencedColumnName: string,
  onDelete: string = 'NO ACTION',
  onUpdate: string = 'NO ACTION'
) => {
  // Step 1: Check if the foreign key already exists
  const result = await queryRunner.query(
    `
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = ?
    AND CONSTRAINT_NAME = ?
    `,
    [tableName, foreignKeyName]
  );

  // Step 2: Add the foreign key if it doesn't already exist
  if (!result || result.length === 0) {
    await queryRunner.query(`
      ALTER TABLE \`${tableName}\`
      ADD CONSTRAINT \`${foreignKeyName}\`
      FOREIGN KEY (\`${columnName}\`)
      REFERENCES \`${referencedTableName}\`(\`${referencedColumnName}\`)
      ON DELETE ${onDelete}
      ON UPDATE ${onUpdate}
    `);
  } else {
    console.log(
      `Foreign key \`${foreignKeyName}\` already exists on table \`${tableName}\``
    );
  }
};
