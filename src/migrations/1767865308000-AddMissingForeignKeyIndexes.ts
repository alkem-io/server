import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingForeignKeyIndexes1767865308000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add index on reference.profileId for faster joins to profile table
    await queryRunner.query(
      `CREATE INDEX "IDX_reference_profileId" ON "reference" ("profileId")`
    );

    // Add index on tagset.profileId for faster joins to profile table
    await queryRunner.query(
      `CREATE INDEX "IDX_tagset_profileId" ON "tagset" ("profileId")`
    );

    // Add index on visual.profileId for faster joins to profile table
    await queryRunner.query(
      `CREATE INDEX "IDX_visual_profileId" ON "visual" ("profileId")`
    );

    // Add index on authorization_policy.parentAuthorizationPolicyId for self-referential joins
    await queryRunner.query(
      `CREATE INDEX "IDX_authorization_policy_parentAuthorizationPolicyId" ON "authorization_policy" ("parentAuthorizationPolicyId")`
    );

    // Add index on authorization_policy.type for filtering by type
    await queryRunner.query(
      `CREATE INDEX "IDX_authorization_policy_type" ON "authorization_policy" ("type")`
    );

    // Run ANALYZE on affected tables to update query planner statistics
    await queryRunner.query(`ANALYZE "reference"`);
    await queryRunner.query(`ANALYZE "tagset"`);
    await queryRunner.query(`ANALYZE "visual"`);
    await queryRunner.query(`ANALYZE "authorization_policy"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_authorization_policy_type"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_authorization_policy_parentAuthorizationPolicyId"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visual_profileId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tagset_profileId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reference_profileId"`);
  }
}
