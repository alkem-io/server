import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixNotificationAndAuthPolicyStaleData1771000026000
  implements MigrationInterface
{
  name = 'FixNotificationAndAuthPolicyStaleData1771000026000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename contributorID -> actorID inside in_app_notification payload JSONB
    const contributorIdCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "in_app_notification"
      WHERE payload ? 'contributorID'
    `);
    console.log(
      `[Migration] Found ${contributorIdCount[0]?.count ?? 0} payloads with contributorID field`
    );

    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET payload = (payload - 'contributorID') || jsonb_build_object('actorID', payload->'contributorID')
      WHERE payload ? 'contributorID'
    `);

    // 2. Rename payload type value SPACE_COMMUNITY_CONTRIBUTOR -> SPACE_COMMUNITY_ACTOR
    const payloadTypeCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "in_app_notification"
      WHERE payload->>'type' = 'SPACE_COMMUNITY_CONTRIBUTOR'
    `);
    console.log(
      `[Migration] Found ${payloadTypeCount[0]?.count ?? 0} payloads with type SPACE_COMMUNITY_CONTRIBUTOR`
    );

    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET payload = jsonb_set(payload, '{type}', '"SPACE_COMMUNITY_ACTOR"')
      WHERE payload->>'type' = 'SPACE_COMMUNITY_CONTRIBUTOR'
    `);

    // 3. Update renamed NotificationEvent enum values in type column
    const vcInvDeclinedCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "in_app_notification"
      WHERE type = 'SPACE_ADMIN_VIRTUAL_CONTRIBUTOR_COMMUNITY_INVITATION_DECLINED'
    `);
    const vcAdminInvCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "in_app_notification"
      WHERE type = 'VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION'
    `);
    console.log(
      `[Migration] Found ${vcInvDeclinedCount[0]?.count ?? 0} rows with old SPACE_ADMIN_VIRTUAL_CONTRIBUTOR_COMMUNITY_INVITATION_DECLINED`
    );
    console.log(
      `[Migration] Found ${vcAdminInvCount[0]?.count ?? 0} rows with old VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION`
    );

    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET type = 'SPACE_ADMIN_VIRTUAL_COMMUNITY_INVITATION_DECLINED'
      WHERE type = 'SPACE_ADMIN_VIRTUAL_CONTRIBUTOR_COMMUNITY_INVITATION_DECLINED'
    `);

    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET type = 'VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION'
      WHERE type = 'VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION'
    `);

    // 4. Clean up orphaned authorization_policy rows from dropped agent table
    const orphanedCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "authorization_policy"
      WHERE "type" = 'agent'
        AND "id" NOT IN (SELECT "authorizationId" FROM "actor" WHERE "authorizationId" IS NOT NULL)
    `);
    console.log(
      `[Migration] Found ${orphanedCount[0]?.count ?? 0} orphaned authorization_policy rows with type 'agent'`
    );

    await queryRunner.query(`
      DELETE FROM "authorization_policy"
      WHERE "type" = 'agent'
        AND "id" NOT IN (SELECT "authorizationId" FROM "actor" WHERE "authorizationId" IS NOT NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert NotificationEvent enum values
    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET type = 'SPACE_ADMIN_VIRTUAL_CONTRIBUTOR_COMMUNITY_INVITATION_DECLINED'
      WHERE type = 'SPACE_ADMIN_VIRTUAL_COMMUNITY_INVITATION_DECLINED'
    `);

    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET type = 'VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION'
      WHERE type = 'VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION'
    `);

    // Revert payload type value
    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET payload = jsonb_set(payload, '{type}', '"SPACE_COMMUNITY_CONTRIBUTOR"')
      WHERE payload->>'type' = 'SPACE_COMMUNITY_ACTOR'
    `);

    // Revert actorID -> contributorID in payload
    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET payload = (payload - 'actorID') || jsonb_build_object('contributorID', payload->'actorID')
      WHERE payload ? 'actorID'
    `);

    // Note: orphaned authorization_policy rows cannot be restored
    console.log(
      `[Migration] Note: deleted orphaned authorization_policy rows with type 'agent' cannot be restored`
    );
  }
}
