import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityCollaborationDateIndex1785600000100
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The non-activity home view introduces two hot aggregations over the
    // `activity` table, both scanning by collaboration + visibility + date:
    //   - exploreSpaces: a platform-wide 7-day GROUP BY COUNT ranking of Spaces
    //   - Space.activityScore: a per-collaboration 7-day COUNT
    // The table currently has no index serving (collaborationID, visibility,
    // createdDate); at scale both queries sequential-scan. A composite btree in
    // that column order lets the WHERE (collaborationID IN ... AND visibility =
    // true AND createdDate >= ...) filter and the GROUP BY use the index.
    //
    // The production migration runner uses TypeORM's default transaction mode
    // (`all`), while PostgreSQL requires CREATE INDEX CONCURRENTLY to run
    // outside a transaction. Temporarily end the framework transaction using the
    // repository's established migration pattern, then restore it. IF NOT EXISTS
    // adopts a canonical index an operator may already have built by hand. A
    // failed concurrent build can leave an INVALID index behind; remove that
    // unusable artifact first so a retry cannot falsely succeed.
    await this.runOutsideTransaction(queryRunner, async () => {
      const existingIndex: { isValid: boolean }[] = await queryRunner.query(`
        SELECT index_state.indisvalid AS "isValid"
        FROM pg_catalog.pg_index AS index_state
        INNER JOIN pg_catalog.pg_class AS index_class
          ON index_class.oid = index_state.indexrelid
        INNER JOIN pg_catalog.pg_namespace AS index_schema
          ON index_schema.oid = index_class.relnamespace
        WHERE index_schema.nspname = current_schema()
          AND index_class.relname = 'IDX_activity_collaboration_visibility_created'
      `);
      if (existingIndex.some(index => !index.isValid)) {
        await queryRunner.query(
          `DROP INDEX CONCURRENTLY IF EXISTS "IDX_activity_collaboration_visibility_created"`
        );
      }

      await queryRunner.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_activity_collaboration_visibility_created" ON "activity" ("collaborationID", "visibility", "createdDate")`
      );
      await queryRunner.query(`ANALYZE "activity"`);
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.runOutsideTransaction(queryRunner, async () => {
      await queryRunner.query(
        `DROP INDEX CONCURRENTLY IF EXISTS "IDX_activity_collaboration_visibility_created"`
      );
    });
  }

  private async runOutsideTransaction(
    queryRunner: QueryRunner,
    operation: () => Promise<void>
  ): Promise<void> {
    const hadActiveTransaction = queryRunner.isTransactionActive;
    if (hadActiveTransaction) {
      await queryRunner.commitTransaction();
    }

    try {
      await operation();
    } finally {
      if (hadActiveTransaction) {
        await queryRunner.startTransaction();
      }
    }
  }
}
