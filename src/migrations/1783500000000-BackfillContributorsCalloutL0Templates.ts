import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-time data repair for the contributors callout
 * (workspace#008-contributor-collection-callout, US6 follow-up).
 *
 * Ensures EVERY existing L0 space content template (`template_content_space.level
 * = 0`) has a PUBLISHED CONTRIBUTORS callout at the FIRST position of its SECOND
 * flow-state tab. The original backfill (1782467322859) plus the platform-default
 * seed (1782998815506) did NOT cover every L0 template:
 *   - the platform-default seed targeted ONLY the PLATFORM_SPACE default template;
 *   - the original backfill's template branch resolved the flow-state
 *     tagsetTemplate via a SIBLING callout, which STARVES on sparse template
 *     callouts sets (a template with few/no flow-tab callouts was skipped);
 *   - templates created after those migrations ran carry no contributors callout
 *     (there is no runtime injection into newly-created templates — this is the
 *     accepted "new templates won't have it" gap; here we only fix EXISTING ones).
 *
 * This migration loops over ALL L0 space content templates and, for each whose
 * second tab lacks a contributors callout, seeds one — the same shape, placement,
 * and idempotency guards as the earlier work, with two deliberate choices carried
 * from the platform-default seed:
 *   - `isTemplate` is inserted as TRUE (it is a template callout);
 *   - the flow-state tagsetTemplate is resolved DIRECTLY via
 *     `callouts_set.tagsetTemplateSetId` (not via a sibling callout — that is the
 *     lookup that starves on sparse sets, the exact bug this repair addresses).
 *
 * The SECOND tab is resolved BY POSITION (the second entry of the flow-state
 * tagsetTemplate's ordered `allowedValues`), so a renamed/localized "Community"
 * tab is still targeted correctly. Live spaces and subspace templates (level != 0)
 * are NOT touched.
 *
 * Idempotency / re-run (safe to run repeatedly):
 *   - skip if the second tab's FIRST callout is already a contributors callout;
 *   - reposition (retag + reorder) a default-shape contributors callout left in
 *     the set by a prior run instead of duplicating;
 *   - skip if a user-created contributors callout already sits in the second tab;
 *   - skip (no insert) when no storage aggregator is reachable.
 *
 * ⚠️ REQUIRED POST-STEP (rollout runbook): the inserted callouts carry EMPTY
 * authorization policies (credentialRules '[]'). Run the platform authorization
 * reset after this migration so they become readable (as with the earlier
 * contributors backfill).
 *
 * down(): removes only the default-shape contributors callouts this migration
 * inserts into L0 templates (generated 'contributors-%' nameID, published, no
 * publisher, no comments room), so user-created contributors callouts are never
 * deleted.
 *
 * Validate with `.scripts/migrations/run_validate_migration.sh` against a DB copy
 * before release.
 */
export class BackfillContributorsCalloutL0Templates1783500000000
  implements MigrationInterface
{
  name = 'BackfillContributorsCalloutL0Templates1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        target_cs_id uuid;
        tts_id uuid;
        new_callout_id uuid;
        new_callout_auth_id uuid;
        new_framing_id uuid;
        new_framing_auth_id uuid;
        new_profile_id uuid;
        new_profile_auth_id uuid;
        new_bucket_id uuid;
        new_bucket_auth_id uuid;
        new_location_id uuid;
        new_classification_id uuid;
        new_classification_auth_id uuid;
        new_tagset_id uuid;
        new_tagset_auth_id uuid;
        new_default_tagset_id uuid;
        new_default_tagset_auth_id uuid;
        flow_state_template_id uuid;
        allowed_values TEXT;
        second_tab_name TEXT;
        first_is_contributors boolean;
        existing_callout_id uuid;
        existing_flowtag_id uuid;
        new_contrib_defaults_id uuid;
        new_name_id varchar(36);
        next_sort_order int;
        storage_aggregator_id uuid;
        default_mime_types TEXT := 'application/pdf,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif';
        default_max_file_size INT := 15728640;
        default_geo_location JSONB := '{"isValid": false}'::jsonb;
        contributors_settings JSONB := jsonb_build_object(
          'framing', jsonb_build_object(
            'commentsEnabled', true,
            'contributors', jsonb_build_object(
              'contributorTypes', jsonb_build_array('user','organization','virtual-contributor'),
              'defaultContributorType', 'user',
              'defaultView', 'list'
            )
          ),
          'contribution', jsonb_build_object(
            'enabled', false,
            'canAddContributions', 'members',
            'allowedTypes', jsonb_build_array(),
            'commentsEnabled', true
          ),
          'visibility', 'published'
        );
      BEGIN
        FOR rec IN
          -- Every L0 space content template's callouts set.
          SELECT
            cs.id AS callouts_set_id,
            cs."tagsetTemplateSetId" AS tagset_template_set_id
          FROM template_content_space tcs
          JOIN collaboration c ON c.id = tcs."collaborationId"
          JOIN callouts_set cs ON cs.id = c."calloutsSetId"
          WHERE tcs.level = 0
        LOOP
          target_cs_id := rec.callouts_set_id;
          tts_id := rec.tagset_template_set_id;

          -- Flow-state tagsetTemplate, resolved DIRECTLY off the callouts set
          -- (the sibling-callout lookup starves on sparse template callouts sets).
          SELECT tt.id, tt."allowedValues"
            INTO flow_state_template_id, allowed_values
            FROM tagset_template tt
            WHERE tt."tagsetTemplateSetId" = tts_id
              AND tt.name = 'flow-state'
            LIMIT 1;
          IF flow_state_template_id IS NULL THEN
            CONTINUE;
          END IF;

          -- SECOND tab BY POSITION (robust to a renamed / localized tab).
          second_tab_name := split_part(COALESCE(allowed_values, ''), ',', 2);
          IF second_tab_name IS NULL OR second_tab_name = '' THEN
            CONTINUE;
          END IF;

          -- Idempotency (1/2): second tab's FIRST callout already contributors → done.
          first_is_contributors := NULL;
          SELECT (cf.type = 'contributors')
            INTO first_is_contributors
            FROM callout co
            JOIN callout_framing cf ON cf.id = co."framingId"
            JOIN classification cl ON cl.id = co."classificationId"
            JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
            WHERE co."calloutsSetId" = target_cs_id
              AND second_tab_name = ANY(string_to_array(t.tags, ','))
            ORDER BY co."sortOrder" ASC
            LIMIT 1;
          IF first_is_contributors IS TRUE THEN
            CONTINUE;
          END IF;

          -- FIRST position within the second tab (MIN - 10; empty tab → -10).
          SELECT COALESCE(MIN(co."sortOrder"), 0) - 10
            INTO next_sort_order
            FROM callout co
            JOIN classification cl ON cl.id = co."classificationId"
            JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
            WHERE co."calloutsSetId" = target_cs_id
              AND second_tab_name = ANY(string_to_array(t.tags, ','));

          -- Re-run repositioning: a default-shape contributors callout left by a
          -- prior run (wrong tab / not first) is MOVED, not duplicated.
          existing_callout_id := NULL;
          existing_flowtag_id := NULL;
          SELECT co.id, t.id
            INTO existing_callout_id, existing_flowtag_id
            FROM callout co
            JOIN callout_framing cf ON cf.id = co."framingId"
            JOIN classification cl ON cl.id = co."classificationId"
            JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
            WHERE co."calloutsSetId" = target_cs_id
              AND cf.type = 'contributors'
              AND co."nameID" LIKE 'contributors-%'
              AND co."publishedBy" IS NULL
              AND co."commentsId" IS NULL
            ORDER BY co."sortOrder" ASC
            LIMIT 1;
          IF existing_callout_id IS NOT NULL THEN
            UPDATE tagset
              SET tags = second_tab_name, "updatedDate" = NOW()
              WHERE id = existing_flowtag_id;
            UPDATE callout
              SET "sortOrder" = next_sort_order, "updatedDate" = NOW()
              WHERE id = existing_callout_id;
            CONTINUE;
          END IF;

          -- Idempotency (2/2): a user contributors callout already in the second
          -- tab (not default-shape) → don't duplicate.
          IF EXISTS (
            SELECT 1
            FROM callout co
            JOIN callout_framing cf ON cf.id = co."framingId"
            JOIN classification cl ON cl.id = co."classificationId"
            JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
            WHERE co."calloutsSetId" = target_cs_id
              AND cf.type = 'contributors'
              AND second_tab_name = ANY(string_to_array(t.tags, ','))
          ) THEN
            CONTINUE;
          END IF;

          -- Storage aggregator: template content spaces have no own aggregator;
          -- reuse the one bound to a sibling callout's framing storage bucket.
          SELECT sb2."storageAggregatorId"
            INTO storage_aggregator_id
            FROM callout co2
            JOIN callout_framing cf2 ON cf2.id = co2."framingId"
            JOIN profile p2 ON p2.id = cf2."profileId"
            JOIN storage_bucket sb2 ON sb2.id = p2."storageBucketId"
            WHERE co2."calloutsSetId" = target_cs_id
              AND sb2."storageAggregatorId" IS NOT NULL
            LIMIT 1;
          IF storage_aggregator_id IS NULL THEN
            CONTINUE;
          END IF;

          new_callout_id          := gen_random_uuid();
          new_callout_auth_id     := gen_random_uuid();
          new_framing_id          := gen_random_uuid();
          new_framing_auth_id     := gen_random_uuid();
          new_profile_id          := gen_random_uuid();
          new_profile_auth_id     := gen_random_uuid();
          new_bucket_id           := gen_random_uuid();
          new_bucket_auth_id      := gen_random_uuid();
          new_location_id         := gen_random_uuid();
          new_classification_id   := gen_random_uuid();
          new_classification_auth_id := gen_random_uuid();
          new_tagset_id           := gen_random_uuid();
          new_tagset_auth_id      := gen_random_uuid();
          new_default_tagset_id      := gen_random_uuid();
          new_default_tagset_auth_id := gen_random_uuid();
          new_contrib_defaults_id := gen_random_uuid();
          new_name_id := 'contributors-' || left(replace(gen_random_uuid()::text, '-', ''), 8);

          INSERT INTO authorization_policy (id,"createdDate","updatedDate",version,"credentialRules","privilegeRules",type) VALUES
            (new_callout_auth_id,        NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'callout'),
            (new_framing_auth_id,        NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'callout-framing'),
            (new_profile_auth_id,        NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'profile'),
            (new_bucket_auth_id,         NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'storage-bucket'),
            (new_classification_auth_id, NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'classification'),
            (new_tagset_auth_id,         NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'tagset'),
            (new_default_tagset_auth_id, NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'tagset');

          INSERT INTO storage_bucket (id,"createdDate","updatedDate",version,"allowedMimeTypes","maxFileSize","authorizationId","storageAggregatorId")
          VALUES (new_bucket_id,NOW(),NOW(),1,default_mime_types,default_max_file_size,new_bucket_auth_id,storage_aggregator_id);

          INSERT INTO location (id,"createdDate","updatedDate",version,"geoLocation")
          VALUES (new_location_id,NOW(),NOW(),1,default_geo_location);

          INSERT INTO profile (id,"createdDate","updatedDate",version,"displayName",type,"authorizationId","locationId","storageBucketId")
          VALUES (new_profile_id,NOW(),NOW(),1,'Contributors','callout-framing',new_profile_auth_id,new_location_id,new_bucket_id);

          INSERT INTO callout_framing (id,"createdDate","updatedDate",version,type,"authorizationId","profileId")
          VALUES (new_framing_id,NOW(),NOW(),1,'contributors',new_framing_auth_id,new_profile_id);

          -- DEFAULT freeform tagset on the framing profile (required by
          -- ProfileResolverFields.tagset).
          INSERT INTO tagset (id,"createdDate","updatedDate",version,name,type,tags,"authorizationId","profileId")
          VALUES (new_default_tagset_id,NOW(),NOW(),1,'default','freeform','',new_default_tagset_auth_id,new_profile_id);

          INSERT INTO classification (id,"createdDate","updatedDate",version,"authorizationId")
          VALUES (new_classification_id,NOW(),NOW(),1,new_classification_auth_id);

          -- Flow-state classification tagset, tagged with the second tab's
          -- displayName, linked to the callouts set's flow-state tagsetTemplate.
          INSERT INTO tagset (id,"createdDate","updatedDate",version,name,type,tags,"authorizationId","classificationId","tagsetTemplateId")
          VALUES (new_tagset_id,NOW(),NOW(),1,'flow-state','select-one',second_tab_name,new_tagset_auth_id,new_classification_id,flow_state_template_id);

          INSERT INTO callout_contribution_defaults (id,"createdDate","updatedDate",version)
          VALUES (new_contrib_defaults_id,NOW(),NOW(),1);

          -- isTemplate = TRUE: this is a template callout.
          INSERT INTO callout
            (id,"createdDate","updatedDate",version,"nameID","isTemplate",settings,"sortOrder","publishedBy","publishedDate",
             "authorizationId","framingId","classificationId","contributionDefaultsId","commentsId","calloutsSetId")
          VALUES
            (new_callout_id,NOW(),NOW(),1,new_name_id,true,contributors_settings,next_sort_order,NULL,NOW(),
             new_callout_auth_id,new_framing_id,new_classification_id,new_contrib_defaults_id,NULL,target_cs_id);
        END LOOP;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Targeted reversal: remove only the default-shape contributors callouts this
    // migration inserts into L0 space content templates (generated
    // 'contributors-%' nameID, published, no publisher, no comments room), so a
    // user-created contributors callout is never deleted. Subspace templates
    // (level != 0) are never targeted by up(), so never touched here.
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
      BEGIN
        FOR rec IN
          SELECT
            co.id AS callout_id,
            co."authorizationId" AS callout_auth_id,
            cf.id AS framing_id,
            cf."authorizationId" AS framing_auth_id,
            p.id AS profile_id,
            p."authorizationId" AS profile_auth_id,
            p."locationId" AS location_id,
            sb.id AS bucket_id,
            sb."authorizationId" AS bucket_auth_id,
            cl.id AS classification_id,
            cl."authorizationId" AS classification_auth_id,
            t."authorizationId" AS tagset_auth_id,
            dt.id AS default_tagset_id,
            dt."authorizationId" AS default_tagset_auth_id,
            cd.id AS contrib_defaults_id
          FROM template_content_space tcs
          JOIN collaboration c ON c.id = tcs."collaborationId"
          JOIN callout co ON co."calloutsSetId" = c."calloutsSetId"
          JOIN callout_framing cf ON cf.id = co."framingId"
          JOIN profile p ON p.id = cf."profileId"
          LEFT JOIN storage_bucket sb ON sb.id = p."storageBucketId"
          JOIN classification cl ON cl.id = co."classificationId"
          JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
          LEFT JOIN tagset dt ON dt."profileId" = p.id AND dt.name = 'default'
          LEFT JOIN callout_contribution_defaults cd ON cd.id = co."contributionDefaultsId"
          WHERE tcs.level = 0
            AND cf.type = 'contributors'
            AND co."nameID" LIKE 'contributors-%'
            AND co.settings->>'visibility' = 'published'
            AND co."commentsId" IS NULL
            AND co."publishedBy" IS NULL
        LOOP
          DELETE FROM callout WHERE id = rec.callout_id;
          DELETE FROM callout_framing WHERE id = rec.framing_id;
          IF rec.default_tagset_id IS NOT NULL THEN DELETE FROM tagset WHERE id = rec.default_tagset_id; END IF;
          DELETE FROM profile WHERE id = rec.profile_id;
          IF rec.bucket_id IS NOT NULL THEN DELETE FROM storage_bucket WHERE id = rec.bucket_id; END IF;
          IF rec.location_id IS NOT NULL THEN DELETE FROM location WHERE id = rec.location_id; END IF;
          DELETE FROM classification WHERE id = rec.classification_id; -- cascades its flow-state tagset
          IF rec.contrib_defaults_id IS NOT NULL THEN DELETE FROM callout_contribution_defaults WHERE id = rec.contrib_defaults_id; END IF;
          DELETE FROM authorization_policy WHERE id IN (
            rec.callout_auth_id, rec.framing_auth_id, rec.profile_auth_id,
            rec.bucket_auth_id, rec.classification_auth_id, rec.tagset_auth_id,
            rec.default_tagset_auth_id
          );
        END LOOP;
      END $$;
    `);
  }
}
