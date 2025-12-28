import { MigrationInterface, QueryRunner } from 'typeorm';

export class StripContributorTypeFromPayloads1766840690000
  implements MigrationInterface
{
  name = 'StripContributorTypeFromPayloads1766840690000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Count payloads containing contributorType before removal
    const beforeCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "in_app_notification"
      WHERE payload ? 'contributorType'
    `);
    console.log(
      `[Migration] Found ${beforeCount[0]?.count ?? 0} payloads with contributorType field`
    );

    // Remove contributorType field from all JSON payloads
    // The - operator removes the key from the JSONB object
    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET payload = payload - 'contributorType'
      WHERE payload ? 'contributorType'
    `);

    // Verify removal
    const afterCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "in_app_notification"
      WHERE payload ? 'contributorType'
    `);
    if (parseInt(afterCount[0]?.count ?? '0') > 0) {
      console.warn(
        `[Migration] WARNING: ${afterCount[0].count} payloads still contain contributorType field`
      );
    } else {
      console.log(
        `[Migration] Successfully removed contributorType from all payloads`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot restore the contributorType field in payloads as we don't know
    // what the original values were. The type can be derived from actor.type
    // if needed at runtime.
    console.log(
      `[Migration] Note: contributorType field cannot be restored to payloads - it can be derived from actor.type at runtime`
    );
  }
}
