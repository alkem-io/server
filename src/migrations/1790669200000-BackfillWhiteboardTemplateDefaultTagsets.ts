import { MigrationInterface, QueryRunner } from 'typeorm';

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
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM template t
          JOIN whiteboard w ON w.id = t."whiteboardId"
          JOIN profile p ON p.id = w."profileId"
          LEFT JOIN authorization_policy profile_auth
            ON profile_auth.id = p."authorizationId"
          WHERE t.type = 'whiteboard'
            AND profile_auth.id IS NULL
        ) THEN
          RAISE EXCEPTION 'Whiteboard Template profile is missing its authorization policy';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM template t
          JOIN whiteboard w ON w.id = t."whiteboardId"
          JOIN profile p ON p.id = w."profileId"
          JOIN tagset ts ON ts."profileId" = p.id
          WHERE t.type = 'whiteboard'
            AND LOWER(ts.name) = 'default'
            AND ts.type = 'freeform'
          GROUP BY p.id
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Whiteboard Template profile has duplicate default freeform tagsets';
        END IF;
      END $$
    `);

    await queryRunner.query(`
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
      )
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
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM template t
          JOIN whiteboard w ON w.id = t."whiteboardId"
          JOIN profile p ON p.id = w."profileId"
          WHERE t.type = 'whiteboard'
            AND NOT EXISTS (
              SELECT 1
              FROM tagset ts
              WHERE ts."profileId" = p.id
                AND LOWER(ts.name) = 'default'
                AND ts.type = 'freeform'
            )
        ) THEN
          RAISE EXCEPTION 'Whiteboard Template profile remains without a default freeform tagset';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM template t
          JOIN whiteboard w ON w.id = t."whiteboardId"
          JOIN profile p ON p.id = w."profileId"
          JOIN tagset ts ON ts."profileId" = p.id
          WHERE t.type = 'whiteboard'
            AND LOWER(ts.name) = 'default'
            AND ts.type = 'freeform'
          GROUP BY p.id
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Whiteboard Template profile has duplicate default freeform tagsets after backfill';
        END IF;
      END $$
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op: removing a repaired default tagset would reintroduce
    // an invalid historical profile shape.
  }
}
