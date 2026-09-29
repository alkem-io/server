import { MigrationInterface, QueryRunner } from 'typeorm';

type PreflightCounts = {
  candidateCount: string | number;
  missingAuthorizationCount: string | number;
  duplicateDefaultCount: string | number;
};

type InsertCounts = {
  insertedCount: string | number;
};

type PostflightCounts = {
  remainingCandidateCount: string | number;
  duplicateDefaultCount: string | number;
};

/**
 * Restores the default freeform tagset on historical Whiteboard Templates.
 *
 * The create path already owns this shape. This migration only selects the
 * historical Template -> Whiteboard -> Profile population that lacks it. The
 * new tagset policy receives the same cascading credential rules that the
 * profile authorization reset gives tagsets at runtime.
 */
export class BackfillWhiteboardTemplateDefaultTagsets1790669200000
  implements MigrationInterface
{
  private emit(phase: string, counts: Record<string, number>): void {
    console.log(
      JSON.stringify({
        migration: 'BackfillWhiteboardTemplateDefaultTagsets',
        phase,
        ...counts,
      })
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [preflight] = (await queryRunner.query(`
      WITH template_profiles AS (
        SELECT DISTINCT
          p.id AS profile_id,
          profile_auth.id AS profile_authorization_id,
          (
            SELECT COUNT(*)
            FROM tagset ts
            WHERE ts."profileId" = p.id
              AND LOWER(ts.name) = 'default'
              AND ts.type = 'freeform'
          ) AS default_count
        FROM template t
        JOIN whiteboard w ON w.id = t."whiteboardId"
        JOIN profile p ON p.id = w."profileId"
        LEFT JOIN authorization_policy profile_auth
          ON profile_auth.id = p."authorizationId"
        WHERE t.type = 'whiteboard'
      )
      SELECT
        COUNT(*) FILTER (
          WHERE profile_authorization_id IS NOT NULL AND default_count = 0
        ) AS "candidateCount",
        COUNT(*) FILTER (
          WHERE profile_authorization_id IS NULL
        ) AS "missingAuthorizationCount",
        COUNT(*) FILTER (
          WHERE default_count > 1
        ) AS "duplicateDefaultCount"
      FROM template_profiles
    `)) as PreflightCounts[];

    const preflightCounts = {
      candidateCount: Number(preflight?.candidateCount ?? 0),
      missingAuthorizationCount: Number(
        preflight?.missingAuthorizationCount ?? 0
      ),
      duplicateDefaultCount: Number(preflight?.duplicateDefaultCount ?? 0),
    };
    this.emit('preflight', preflightCounts);

    if (preflightCounts.missingAuthorizationCount > 0) {
      throw new Error(
        'Whiteboard Template profile is missing its authorization policy'
      );
    }
    if (preflightCounts.duplicateDefaultCount > 0) {
      throw new Error(
        'Whiteboard Template profile has duplicate default freeform tagsets'
      );
    }

    const [inserted] = (await queryRunner.query(`
      WITH template_profiles AS (
        SELECT DISTINCT ON (p.id)
          p.id AS profile_id,
          profile_auth."credentialRules"::jsonb AS profile_credential_rules
        FROM template t
        JOIN whiteboard w ON w.id = t."whiteboardId"
        JOIN profile p ON p.id = w."profileId"
        JOIN authorization_policy profile_auth
          ON profile_auth.id = p."authorizationId"
        WHERE t.type = 'whiteboard'
          AND NOT EXISTS (
            SELECT 1
            FROM tagset existing
            WHERE existing."profileId" = p.id
              AND LOWER(existing.name) = 'default'
              AND existing.type = 'freeform'
          )
        ORDER BY p.id
      ),
      candidates AS (
        SELECT
          profile_id,
          profile_credential_rules,
          uuid_generate_v4() AS tagset_id,
          uuid_generate_v4() AS tagset_authorization_id
        FROM template_profiles
      ),
      inserted_authorizations AS (
        INSERT INTO authorization_policy
          (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
        SELECT
          tagset_authorization_id,
          NOW(),
          NOW(),
          1,
          COALESCE(
            (
              SELECT jsonb_agg(rule)
              FROM jsonb_array_elements(profile_credential_rules) AS rule
              WHERE COALESCE((rule ->> 'cascade')::boolean, false)
            ),
            '[]'::jsonb
          ),
          '[]'::jsonb,
          'tagset'
        FROM candidates
        RETURNING id
      ),
      inserted_tagsets AS (
        INSERT INTO tagset
          (id, "createdDate", "updatedDate", version, name, type, tags, "authorizationId", "profileId")
        SELECT
          tagset_id,
          NOW(),
          NOW(),
          1,
          'default',
          'freeform',
          '',
          tagset_authorization_id,
          profile_id
        FROM candidates
        JOIN inserted_authorizations
          ON inserted_authorizations.id = candidates.tagset_authorization_id
        RETURNING id
      )
      SELECT COUNT(*) AS "insertedCount"
      FROM inserted_tagsets
    `)) as InsertCounts[];

    this.emit('insert', {
      insertedCount: Number(inserted?.insertedCount ?? 0),
    });

    const [postflight] = (await queryRunner.query(`
      WITH template_profiles AS (
        SELECT DISTINCT p.id AS profile_id
        FROM template t
        JOIN whiteboard w ON w.id = t."whiteboardId"
        JOIN profile p ON p.id = w."profileId"
        WHERE t.type = 'whiteboard'
      )
      SELECT
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1
            FROM tagset ts
            WHERE ts."profileId" = profile_id
              AND LOWER(ts.name) = 'default'
              AND ts.type = 'freeform'
          )
        ) AS "remainingCandidateCount",
        COUNT(*) FILTER (
          WHERE (
            SELECT COUNT(*)
            FROM tagset ts
            WHERE ts."profileId" = profile_id
              AND LOWER(ts.name) = 'default'
              AND ts.type = 'freeform'
          ) > 1
        ) AS "duplicateDefaultCount"
      FROM template_profiles
    `)) as PostflightCounts[];

    const postflightCounts = {
      remainingCandidateCount: Number(
        postflight?.remainingCandidateCount ?? 0
      ),
      duplicateDefaultCount: Number(postflight?.duplicateDefaultCount ?? 0),
    };
    this.emit('postflight', postflightCounts);

    if (postflightCounts.remainingCandidateCount > 0) {
      throw new Error(
        'Whiteboard Template profile remains without a default freeform tagset'
      );
    }
    if (postflightCounts.duplicateDefaultCount > 0) {
      throw new Error(
        'Whiteboard Template profile has duplicate default freeform tagsets after backfill'
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op: removing a repaired default tagset would reintroduce
    // an invalid historical profile shape.
  }
}
