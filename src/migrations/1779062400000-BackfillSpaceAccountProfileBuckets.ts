import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repairs Space/Account profiles created by migration 1771000022000
 * (MoveNameIdToActorAddSpaceAccountProfiles) which inserted minimal
 * profile rows for pre-existing Spaces/Accounts but skipped creating
 * the `storage_bucket` and `location` rows that
 * `ProfileService.createProfile()` normally creates alongside.
 *
 * Affected rows are detectable as: `profile.type IN ('space','account')`
 * AND `profile.storageBucketId IS NULL`. The parent storage_aggregator is
 * resolved via the owning Space or Account, both of which extend Actor
 * (CTI) so `actor.id = space.id = account.id`.
 *
 * Without this repair, `ProfileAuthorizationService.applyAuthorizationPolicy`
 * fails its relation null-check (`!profile.storageBucket`) on auth-reset of
 * the owning Space/Account, throwing `RelationshipNotFoundException`.
 */
export class BackfillSpaceAccountProfileBuckets1779062400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        new_bucket_id uuid;
        new_bucket_auth_id uuid;
        new_location_id uuid;
        default_mime_types TEXT := 'application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,application/rtf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.presentation,application/vnd.ms-powerpoint.presentation.macroEnabled.12,application/vnd.openxmlformats-officedocument.presentationml.slideshow,application/vnd.ms-powerpoint.slideshow.macroEnabled.12,application/vnd.openxmlformats-officedocument.presentationml.template,application/vnd.ms-powerpoint.template.macroEnabled.12,application/vnd.oasis.opendocument.graphics,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif,image/heic,image/heif';
        default_max_file_size INT := 15728640;
        default_geo_location JSONB := '{"isValid": false}'::jsonb;
        skipped_count INT := 0;
      BEGIN
        FOR rec IN
          SELECT
            p.id AS profile_id,
            COALESCE(s."storageAggregatorId", acc."storageAggregatorId") AS aggregator_id
          FROM profile p
          INNER JOIN actor a ON a."profileId" = p.id
          LEFT JOIN space s ON s.id = a.id AND a.type = 'space'
          LEFT JOIN account acc ON acc.id = a.id AND a.type = 'account'
          WHERE p.type IN ('space', 'account')
            AND p."storageBucketId" IS NULL
        LOOP
          IF rec.aggregator_id IS NULL THEN
            -- Owning Space/Account has no storage_aggregator either; cannot
            -- create a bucket without one. Skip and let the operator triage.
            skipped_count := skipped_count + 1;
            RAISE NOTICE
              'Skipping profile % — parent Space/Account has no storage_aggregator',
              rec.profile_id;
            CONTINUE;
          END IF;

          new_bucket_id := gen_random_uuid();
          new_bucket_auth_id := gen_random_uuid();
          new_location_id := gen_random_uuid();

          INSERT INTO authorization_policy
            (id, "createdDate", "updatedDate", version,
             "credentialRules", "privilegeRules", type)
          VALUES
            (new_bucket_auth_id, NOW(), NOW(), 1,
             '[]'::jsonb, '[]'::jsonb, 'storage-bucket');

          INSERT INTO storage_bucket
            (id, "createdDate", "updatedDate", version,
             "allowedMimeTypes", "maxFileSize",
             "authorizationId", "storageAggregatorId")
          VALUES
            (new_bucket_id, NOW(), NOW(), 1,
             default_mime_types, default_max_file_size,
             new_bucket_auth_id, rec.aggregator_id);

          INSERT INTO location
            (id, "createdDate", "updatedDate", version, "geoLocation")
          VALUES
            (new_location_id, NOW(), NOW(), 1, default_geo_location);

          UPDATE profile
          SET "storageBucketId" = new_bucket_id,
              "locationId" = new_location_id
          WHERE id = rec.profile_id;
        END LOOP;

        IF skipped_count > 0 THEN
          RAISE NOTICE
            '% profile(s) skipped: parent has no storage_aggregator. Manual review required.',
            skipped_count;
        END IF;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Data-repair migration with no safe automatic reversal: once the
    // backfilled buckets are in use (documents uploaded, auth rules
    // populated by reset), deleting them would lose work. If you need to
    // undo a botched migration run, do so manually with full operator
    // context.
  }
}
