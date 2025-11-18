import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * **Phase 1: PLATFORM_FORUM_DISCUSSION notifications (roomID)**
 *   1. Drop existing FK constraint `FK_439dd686c1912533c380b783f0b` on `roomID`
 *   2. Extract correct `roomID` from payload JSON field `$.discussion.id` and update the column
 *   3. Delete orphaned records: any notification with non-NULL `roomID` that doesn't match
 *      an existing room in the `room` table (LEFT JOIN finds NULL matches)
 *   4. Re-add FK constraint `FK_439dd686c1912533c380b783f0b` with CASCADE delete
 *
 * **Phase 2: VIRTUAL_CONTRIBUTOR notifications (spaceID)**
 *   1. Drop existing FK constraint `FK_60085ab32808bc5f628fe3ca587` on `spaceID`
 *   2. Extract correct `spaceID` from payload JSON field `$.space.id` and update the column
 *   3. Delete orphaned records: any notification with non-NULL `spaceID` that doesn't match
 *      an existing space in the `space` table
 *   4. Re-add FK constraint `FK_60085ab32808bc5f628fe3ca587` with CASCADE delete
 *
 * **Phase 3: VIRTUAL_CONTRIBUTOR notifications (contributorVcID)**
 *   1. Drop existing FK constraint `FK_c9c5d92154e4300bad54b7bbcc7` on `contributorVcID`
 *   2. Extract correct `contributorVcID` from payload JSON field `$.virtualContributorID` and update
 *   3. Delete orphaned records: any notification with non-NULL `contributorVcID` that doesn't match
 *      an existing virtual contributor in the `virtual_contributor` table
 *   4. Re-add FK constraint `FK_c9c5d92154e4300bad54b7bbcc7` with CASCADE delete
 *
 * **Key Principles:**
 * - Source of truth is the JSON payload; FK columns are synchronized from payload data
 * - Orphaned notifications (where parent entity was deleted) are removed to maintain referential integrity
 * - LEFT JOIN pattern identifies orphans: `LEFT JOIN parent ON fk = parent.id WHERE parent.id IS NULL`
 * - All re-added constraints use `ON DELETE CASCADE` to prevent future orphans
 *
 * **Rollback:**
 * Down migration is intentionally empty; reversing this would require restoring deleted orphaned
 * records and broken FK references, which is not desirable. Any rollback should be coordinated
 * with a database backup restoration.
 */
export class NotificationEntityTrackingFixes1763390167422
  implements MigrationInterface
{
  name = 'NotificationEntityTrackingFixes1763390167422';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // todo: how to delete notifications connected to deleted messages
    // target payload instead of notifications since the notifications are unified, and the problems that need fixing are
    //  ===== PLATFORM_FORUM_DISCUSSION =====
    // roomID to be payload.discussion.id
    // NOTE: '$.comment.id' does not exist at the point when the migration was ran, so we are not setting commentID here
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_439dd686c1912533c380b783f0b\``
    );
    await queryRunner.query(`
      UPDATE in_app_notification
      SET roomID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.discussion.id'))
      WHERE JSON_EXTRACT(payload, '$.type') = 'PLATFORM_FORUM_DISCUSSION'
    `);
    // drop orphaned records
    await queryRunner.query(`
      DELETE n FROM in_app_notification n
      LEFT JOIN room r ON r.id = n.roomID
      WHERE n.roomID IS NOT NULL AND r.id IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_439dd686c1912533c380b783f0b\` FOREIGN KEY (\`roomID\`) REFERENCES \`room\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    // ===== VIRTUAL_CONTRIBUTOR =====
    // spaceID
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_60085ab32808bc5f628fe3ca587\``
    );
    // contributorVcID
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` DROP FOREIGN KEY \`FK_c9c5d92154e4300bad54b7bbcc7\``
    );
    // spaceID to be payload.space.id
    // contributorVcID to be payload.virtualContributorID
    await queryRunner.query(`
      UPDATE in_app_notification
      SET
       spaceID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.space.id')),
       contributorVcID = JSON_UNQUOTE(JSON_EXTRACT(payload, '$.virtualContributorID'))
      WHERE JSON_EXTRACT(payload, '$.type') = 'VIRTUAL_CONTRIBUTOR'
    `);
    // drop orphaned records
    await queryRunner.query(`
      DELETE n FROM in_app_notification n
      LEFT JOIN space s ON s.id = n.spaceID
      WHERE n.spaceID IS NOT NULL AND s.id IS NULL
    `);
    await queryRunner.query(`
      DELETE n FROM in_app_notification n
      LEFT JOIN virtual_contributor vc ON vc.id = n.contributorVcID
      WHERE n.contributorVcID IS NOT NULL AND vc.id IS NULL
    `);
    // re-add constraints
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_60085ab32808bc5f628fe3ca587\` FOREIGN KEY (\`spaceID\`) REFERENCES \`space\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` ADD CONSTRAINT \`FK_c9c5d92154e4300bad54b7bbcc7\` FOREIGN KEY (\`contributorVcID\`) REFERENCES \`virtual_contributor\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
