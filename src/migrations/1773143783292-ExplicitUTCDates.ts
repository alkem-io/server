import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExplicitUTCDates1773143783292 implements MigrationInterface {
  name = 'ExplicitUTCDates1773143783292';

  private async getTablesWithColumn(
    queryRunner: QueryRunner,
    columnName: string,
    dataType: string
  ): Promise<string[]> {
    const rows: { table_name: string }[] = await queryRunner.query(
      `SELECT table_name FROM information_schema.columns
       WHERE column_name = $1
         AND data_type = $2
         AND table_schema = 'public'
       ORDER BY table_name`,
      [columnName, dataType]
    );
    return rows.map(r => r.table_name);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tablesWithCreatedDate = await this.getTablesWithColumn(
      queryRunner,
      'createdDate',
      'timestamp without time zone'
    );
    for (const table of tablesWithCreatedDate) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
          ALTER COLUMN "createdDate" TYPE timestamptz USING "createdDate" AT TIME ZONE 'UTC'`
      );
    }

    const tablesWithUpdatedDate = await this.getTablesWithColumn(
      queryRunner,
      'updatedDate',
      'timestamp without time zone'
    );
    for (const table of tablesWithUpdatedDate) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
          ALTER COLUMN "updatedDate" TYPE timestamptz USING "updatedDate" AT TIME ZONE 'UTC'`
      );
    }

    const tablesWithCreatedAt = await this.getTablesWithColumn(
      queryRunner,
      'createdAt',
      'timestamp without time zone'
    );
    for (const table of tablesWithCreatedAt) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
          ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tablesWithCreatedDate = await this.getTablesWithColumn(
      queryRunner,
      'createdDate',
      'timestamp with time zone'
    );
    for (const table of tablesWithCreatedDate) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
          ALTER COLUMN "createdDate" TYPE timestamp USING "createdDate" AT TIME ZONE 'UTC'`
      );
    }

    const tablesWithUpdatedDate = await this.getTablesWithColumn(
      queryRunner,
      'updatedDate',
      'timestamp with time zone'
    );
    for (const table of tablesWithUpdatedDate) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
          ALTER COLUMN "updatedDate" TYPE timestamp USING "updatedDate" AT TIME ZONE 'UTC'`
      );
    }

    const tablesWithCreatedAt = await this.getTablesWithColumn(
      queryRunner,
      'createdAt',
      'timestamp with time zone'
    );
    for (const table of tablesWithCreatedAt) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
          ALTER COLUMN "createdAt" TYPE timestamp USING "createdAt" AT TIME ZONE 'UTC'`
      );
    }
  }
}
