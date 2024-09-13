import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSpaceFK1726062072715 implements MigrationInterface {
  name = 'FixSpaceFK1726062072715';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Log the IDs of rows with invalid `parentSpaceId`
    const invalidRows = await queryRunner.query(`
      SELECT s.\`id\`
      FROM \`space\` s
      LEFT JOIN \`space\` parent ON s.\`parentSpaceId\` = parent.\`id\`
      WHERE s.\`parentSpaceId\` IS NOT NULL
      AND parent.\`id\` IS NULL;
    `);

    if (invalidRows.length > 0) {
      // Log the IDs of rows with invalid `parentSpaceId`
      const invalidRowIds = invalidRows.map((row: any) => row.id);
      console.log(
        'Updating invalid parentSpaceId for rows with IDs:',
        invalidRowIds
      );

      // Step 2: Update the invalid `parentSpaceId` rows and set to NULL
      await queryRunner.query(`
        UPDATE \`space\` s
        LEFT JOIN \`space\` parent ON s.\`parentSpaceId\` = parent.\`id\`
        SET s.\`parentSpaceId\` = NULL
        WHERE s.\`parentSpaceId\` IS NOT NULL
        AND parent.\`id\` IS NULL;
      `);
    }

    // Step 3: Add the foreign key constraint
    await queryRunner.query(`
      ALTER TABLE \`space\`
      ADD CONSTRAINT \`FK_ef1ff4ac7f613cc0677e2295b30\`
      FOREIGN KEY (\`parentSpaceId\`) REFERENCES \`space\`(\`id\`)
      ON DELETE NO ACTION ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint if migration is rolled back
    await queryRunner.query(`
      ALTER TABLE \`space\`
      DROP FOREIGN KEY \`FK_ef1ff4ac7f613cc0677e2295b30\`;
    `);
  }
}
