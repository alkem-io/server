import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-time data migration (workspace#008-contributor-collection-callout, US6).
 *
 * Backfills exactly one PUBLISHED CONTRIBUTORS callout into the Community tab
 * (flow-state tagset containing 'Community') of every L0 space (space.level = 0)
 * that does not already have one there. Subspaces (level != 0) are untouched.
 *
 * Idempotency is scoped to the Community tab: a space whose only contributors
 * callout lives in another tab still receives one in the Community tab
 * (FR-025 rollout guarantee). Re-running is a no-op for Community tabs that
 * already hold a contributors callout.
 *
 * The migration is SILENT — it inserts rows directly, bypassing the mutation's
 * notification / activity / publish adapters, so it emits no notifications,
 * activity-log entries, or emails (FR-028).
 *
 * ⚠️ REQUIRED POST-STEP (rollout runbook): the inserted callouts carry EMPTY
 * authorization policies (credentialRules '[]'). They are therefore unreadable —
 * and invisible in the Community tab — until an authorization reset recomputes
 * them. After running this migration you MUST run the platform authorization
 * reset (GraphQL `mutation { authorizationPolicyResetAll }` as a global admin,
 * or the equivalent per-space reset) so the engine grants the standard
 * space/collaboration read rules. Without this step the backfill appears to have
 * done nothing. Sequence: migrate → authorizationPolicyResetAll → (then the
 * client widget-removal release, FR-026).
 *
 * Per target space it inserts the minimal valid graph the running app resolves
 * without throwing:
 *   authorization_policy x7 (callout, callout_framing, profile, storage_bucket,
 *     classification, flow-state tagset, default tagset) — empty rule arrays;
 *     the authorization reset (post-step above) repopulates them.
 *   storage_bucket (REQUIRED: CalloutService.getStorageBucket throws if absent),
 *     bound to the space's storage aggregator.
 *   location, profile (type 'callout-framing') + its DEFAULT freeform tagset
 *     (REQUIRED: ProfileResolverFields.tagset throws ENTITY_NOT_FOUND without it).
 *   callout_framing (type 'contributors').
 *   classification + flow-state tagset (tags 'Community', type 'select-one'),
 *     linked to the calloutsSet's flow-state tagsetTemplate (REQUIRED:
 *     classification.flowState.allowedValues throws without it).
 *   callout_contribution_defaults (kept for the update/delete paths).
 *   callout (PUBLISHED; settings mirror DefaultCalloutSettings + the default
 *     contributors block: all three types, defaultContributorType USER,
 *     defaultView LIST).
 * No comments Room is created: the framing is a passive display, every
 * read/auth path tolerates a null commentsId, and a SQL-inserted room would
 * have no Matrix backing.
 *
 * Validate with `.scripts/migrations/run_validate_migration.sh` against a DB copy
 * before release.
 */
export class BackfillContributorsCalloutL0Community1782467322859
  implements MigrationInterface
{
  name = 'BackfillContributorsCalloutL0Community1782467322859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
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
        new_contrib_defaults_id uuid;
        new_name_id varchar(36);
        next_sort_order int;
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
          SELECT
            cs.id AS callouts_set_id,
            s.id AS space_id,
            s."storageAggregatorId" AS storage_aggregator_id
          FROM space s
          JOIN collaboration c ON c.id = s."collaborationId"
          JOIN callouts_set cs ON cs.id = c."calloutsSetId"
          WHERE s.level = 0
            AND s."storageAggregatorId" IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM callout co
              JOIN callout_framing cf ON cf.id = co."framingId"
              JOIN classification cl ON cl.id = co."classificationId"
              JOIN tagset t ON t."classificationId" = cl.id
              WHERE co."calloutsSetId" = cs.id
                AND cf.type = 'contributors'
                AND t.name = 'flow-state'
                AND ('Community' = ANY(string_to_array(t.tags, ',')))
            )
        LOOP
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

          SELECT COALESCE(MAX(co."sortOrder"), 0) + 10
            INTO next_sort_order
            FROM callout co
            WHERE co."calloutsSetId" = rec.callouts_set_id;

          -- The Community-tab flow-state tagset MUST reference the space's
          -- flow-state tagsetTemplate (one per calloutsSet) so the client can
          -- resolve classification.flowState.allowedValues. Reuse the template
          -- already used by this calloutsSet's other callouts.
          SELECT ts."tagsetTemplateId" INTO flow_state_template_id
            FROM callout co2
            JOIN callout_framing cf2 ON cf2.id = co2."framingId"
            JOIN classification cl2 ON cl2.id = co2."classificationId"
            JOIN tagset ts ON ts."classificationId" = cl2.id
            WHERE co2."calloutsSetId" = rec.callouts_set_id
              AND ts.name = 'flow-state'
              AND ts."tagsetTemplateId" IS NOT NULL
            LIMIT 1;
          -- Without the flow-state template we cannot place a tab; skip
          -- (does not happen for L0 spaces, which always have flow-tab callouts).
          IF flow_state_template_id IS NULL THEN
            CONTINUE;
          END IF;

          INSERT INTO authorization_policy (id,"createdDate","updatedDate",version,"credentialRules","privilegeRules",type) VALUES
            (new_callout_auth_id,        NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'callout'),
            (new_framing_auth_id,        NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'callout-framing'),
            (new_profile_auth_id,        NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'profile'),
            (new_bucket_auth_id,         NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'storage-bucket'),
            (new_classification_auth_id, NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'classification'),
            (new_tagset_auth_id,         NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'tagset'),
            (new_default_tagset_auth_id, NOW(),NOW(),1,'[]'::jsonb,'[]'::jsonb,'tagset');

          INSERT INTO storage_bucket (id,"createdDate","updatedDate",version,"allowedMimeTypes","maxFileSize","authorizationId","storageAggregatorId")
          VALUES (new_bucket_id,NOW(),NOW(),1,default_mime_types,default_max_file_size,new_bucket_auth_id,rec.storage_aggregator_id);

          INSERT INTO location (id,"createdDate","updatedDate",version,"geoLocation")
          VALUES (new_location_id,NOW(),NOW(),1,default_geo_location);

          INSERT INTO profile (id,"createdDate","updatedDate",version,"displayName",type,"authorizationId","locationId","storageBucketId")
          VALUES (new_profile_id,NOW(),NOW(),1,'Contributors','callout-framing',new_profile_auth_id,new_location_id,new_bucket_id);

          INSERT INTO callout_framing (id,"createdDate","updatedDate",version,type,"authorizationId","profileId")
          VALUES (new_framing_id,NOW(),NOW(),1,'contributors',new_framing_auth_id,new_profile_id);

          -- DEFAULT freeform tagset on the framing profile. Every callout profile
          -- has one; ProfileResolverFields.tagset throws ENTITY_NOT_FOUND without it.
          INSERT INTO tagset (id,"createdDate","updatedDate",version,name,type,tags,"authorizationId","profileId")
          VALUES (new_default_tagset_id,NOW(),NOW(),1,'default','freeform','',new_default_tagset_auth_id,new_profile_id);

          INSERT INTO classification (id,"createdDate","updatedDate",version,"authorizationId")
          VALUES (new_classification_id,NOW(),NOW(),1,new_classification_auth_id);

          -- Flow-state classification tagset, linked to the calloutsSet's
          -- flow-state tagsetTemplate so classification.flowState.allowedValues resolves.
          INSERT INTO tagset (id,"createdDate","updatedDate",version,name,type,tags,"authorizationId","classificationId","tagsetTemplateId")
          VALUES (new_tagset_id,NOW(),NOW(),1,'flow-state','select-one','Community',new_tagset_auth_id,new_classification_id,flow_state_template_id);

          INSERT INTO callout_contribution_defaults (id,"createdDate","updatedDate",version)
          VALUES (new_contrib_defaults_id,NOW(),NOW(),1);

          INSERT INTO callout
            (id,"createdDate","updatedDate",version,"nameID","isTemplate",settings,"sortOrder","publishedBy","publishedDate",
             "authorizationId","framingId","classificationId","contributionDefaultsId","commentsId","calloutsSetId")
          VALUES
            (new_callout_id,NOW(),NOW(),1,new_name_id,false,contributors_settings,next_sort_order,NULL,NOW(),
             new_callout_auth_id,new_framing_id,new_classification_id,new_contrib_defaults_id,NULL,rec.callouts_set_id);
        END LOOP;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Targeted reversal: remove only the PUBLISHED CONTRIBUTORS callouts in the
    // Community tab of L0 spaces that still carry the exact default shape this
    // migration produced (generated nameID, published, no comments room).
    // Children are deleted explicitly; deleting the classification cascades its
    // flow-state tagset, and the profile's DEFAULT tagset is removed before the
    // profile (tagset.profileId FK).
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
          FROM space s
          JOIN collaboration c ON c.id = s."collaborationId"
          JOIN callouts_set cs ON cs.id = c."calloutsSetId"
          JOIN callout co ON co."calloutsSetId" = cs.id
          JOIN callout_framing cf ON cf.id = co."framingId"
          JOIN profile p ON p.id = cf."profileId"
          LEFT JOIN storage_bucket sb ON sb.id = p."storageBucketId"
          JOIN classification cl ON cl.id = co."classificationId"
          JOIN tagset t ON t."classificationId" = cl.id
          LEFT JOIN tagset dt ON dt."profileId" = p.id AND dt.name = 'default'
          LEFT JOIN callout_contribution_defaults cd ON cd.id = co."contributionDefaultsId"
          WHERE s.level = 0
            AND cf.type = 'contributors'
            AND t.name = 'flow-state'
            AND ('Community' = ANY(string_to_array(t.tags, ',')))
            AND co."nameID" LIKE 'contributors-%'
            AND co.settings->>'visibility' = 'published'
            AND co."commentsId" IS NULL
        LOOP
          DELETE FROM callout WHERE id = rec.callout_id;
          DELETE FROM callout_framing WHERE id = rec.framing_id;
          -- Delete the profile's DEFAULT tagset before the profile (tagset.profileId FK).
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
