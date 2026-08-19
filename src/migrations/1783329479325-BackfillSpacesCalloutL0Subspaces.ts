import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-time data migration (workspace#013-spaces-collection-callout, US3).
 *
 * Backfills exactly one PUBLISHED SPACES callout into the FIRST position of the
 * THIRD (Subspaces) flow-state tab of:
 *   - every L0 space (space.level = 0), and
 *   - every L0 space content template (template_content_space.level = 0 — ALL of
 *     them, not just the platform default, so every L0 space template is
 *     consistent), so new spaces created from a template inherit the callout
 *     (the clone path copies the framing type).
 * The third tab is resolved BY POSITION — the third entry of the flow-state
 * tagsetTemplate's ordered `allowedValues` — regardless of its displayName, so a
 * renamed / localized "Subspaces" tab is still targeted correctly. Subspaces and
 * subspace content templates (level != 0) are UNTOUCHED, and no subspace
 * sortOrder / pinned value is ever modified (FR-015 / FR-016).
 *
 * Contrast with the 008 contributors backfill: a SPACES callout is CONFIG-FREE.
 * There is no framing settings block (no contributors object, no counts, no
 * view); the callout `settings` carry only the standard visibility/contribution
 * defaults, and the framing type alone drives behaviour. No hardcoded subspace
 * IDs are stored — the callout self-populates from the host space's subspaces at
 * read time.
 *
 * `isTemplate` is set per source: rows inserted into a LIVE L0 space get
 * `isTemplate = false`; rows inserted into an L0 space content template get
 * `isTemplate = true` (the app forces this for callouts created inside a
 * template — a false template callout is treated as LIVE and would create an
 * orphan comments room / emit publish info on edit). This folds in the fix that
 * 008 needed a separate follow-up migration for; here the backfill has not
 * shipped, so it is corrected inline. The platform default L0 space template is
 * seeded by the template branch of this same loop (its level is already 0; its
 * flow-state tagsetTemplate is resolved DIRECTLY via callouts_set.tagsetTemplateSetId
 * — robust on sparse templates — and its storage aggregator from a sibling
 * callout's framing bucket, which the `welcome` callout supplies) — no separate
 * platform-default seed migration is needed.
 *
 * Template content spaces have no storageAggregatorId column; the callout's
 * storage bucket reuses the aggregator already bound to a sibling callout's
 * framing storage bucket in the same calloutsSet.
 *
 * Placement: the callout is given a `sortOrder` strictly BELOW the minimum of
 * the callouts already in that third tab (NOT MAX+10), so it renders FIRST within
 * the tab (where the hard-coded subspaces block used to render). Negative
 * sortOrders are idiomatic in this codebase (create-at-front = MIN - 10).
 *
 * ONE-TIME / NO RESURRECTION: this is a standard TypeORM migration recorded in
 * the migrations table — it runs ONCE at rollout and is never re-scheduled. It
 * therefore does NOT re-provision a space after the fact, and a deliberately
 * deleted default is NOT resurrected (FR-017 / SC-013).
 *
 * Idempotency / re-run (safe to run repeatedly, incl. on environments where an
 * earlier version of this migration already ran) — a no-op safety net, not
 * recurring behaviour:
 *   - If the third tab's FIRST callout is already a SPACES callout → skip.
 *   - Else, if a prior run of THIS migration left a default-shape SPACES callout
 *     anywhere in the calloutsSet (e.g. tagged a since-renamed tab) → MOVE it
 *     into the third tab at first position (retag + reorder) instead of
 *     inserting a duplicate.
 *   - Else, if the third tab already holds someone else's SPACES callout → skip.
 *   - Else → insert a fresh one at first position.
 *
 * The migration is SILENT — it inserts rows directly, bypassing the mutation's
 * notification / activity / publish adapters, so it emits no notifications,
 * activity-log entries, or emails (FR-019).
 *
 * ⚠️ REQUIRED POST-STEP (rollout runbook, FR-020): the inserted callouts carry
 * EMPTY authorization policies (credentialRules '[]'). They are therefore
 * unreadable — and invisible in the Subspaces tab — until an authorization reset
 * recomputes them. After running this migration you MUST run the platform
 * authorization reset (GraphQL `mutation { authorizationPolicyResetAll }` as a
 * global admin, or the equivalent per-space reset) so the engine grants the
 * standard space/collaboration read rules. Without this step the backfill
 * appears to have done nothing. Sequence:
 *   migrate → authorizationPolicyResetAll → (then the client block-removal release).
 *
 * Per target space it inserts the minimal valid graph the running app resolves
 * without throwing (008 R8 learnings):
 *   authorization_policy x7 (callout, callout_framing, profile, storage_bucket,
 *     classification, flow-state tagset, default tagset) — empty rule arrays;
 *     the authorization reset (post-step above) repopulates them.
 *   storage_bucket (REQUIRED: CalloutService.getStorageBucket throws if absent),
 *     bound to the space's storage aggregator.
 *   location, profile (type 'callout-framing', displayName 'Subspaces') + its
 *     DEFAULT freeform tagset (REQUIRED: ProfileResolverFields.tagset throws
 *     ENTITY_NOT_FOUND without it).
 *   callout_framing (type 'spaces').
 *   classification + flow-state tagset (tags = the third tab's displayName,
 *     type 'select-one'), linked to the calloutsSet's flow-state tagsetTemplate
 *     (REQUIRED: classification.flowState.allowedValues throws without it).
 *   callout_contribution_defaults (kept for the update/delete paths).
 *   callout (PUBLISHED; settings mirror DefaultCalloutSettings — CONFIG-FREE
 *     framing, no contributors block).
 * No comments Room is created: the framing is a passive display, every
 * read/auth path tolerates a null commentsId, and a SQL-inserted room would
 * have no Matrix backing.
 *
 * Validate with `.scripts/migrations/run_validate_migration.sh` against a DB copy
 * before release.
 */
export class BackfillSpacesCalloutL0Subspaces1783329479325
  implements MigrationInterface
{
  name = 'BackfillSpacesCalloutL0Subspaces1783329479325';

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
        allowed_values TEXT;
        third_tab_name TEXT;
        first_is_spaces boolean;
        existing_callout_id uuid;
        existing_flowtag_id uuid;
        new_contrib_defaults_id uuid;
        new_name_id varchar(36);
        next_sort_order int;
        default_mime_types TEXT := 'application/pdf,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif';
        default_max_file_size INT := 15728640;
        default_geo_location JSONB := '{"isValid": false}'::jsonb;
        -- CONFIG-FREE: no framing.contributors block. Standard callout defaults
        -- only. The framing type alone ('spaces') drives behaviour.
        spaces_settings JSONB := jsonb_build_object(
          'framing', jsonb_build_object(
            'commentsEnabled', true
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
          -- Live L0 spaces: storage aggregator taken directly from the space.
          -- is_template = false → a live-space callout.
          SELECT
            cs.id AS callouts_set_id,
            s."storageAggregatorId" AS storage_aggregator_id,
            cs."tagsetTemplateSetId" AS tagset_template_set_id,
            false AS is_template
          FROM space s
          JOIN collaboration c ON c.id = s."collaborationId"
          JOIN callouts_set cs ON cs.id = c."calloutsSetId"
          WHERE s.level = 0
            AND s."storageAggregatorId" IS NOT NULL
          UNION ALL
          -- L0 space content templates: template_content_space has NO
          -- storageAggregatorId column, so reuse the storage aggregator already
          -- bound to a sibling callout's framing storage bucket in the same
          -- calloutsSet. Adding the callout here makes new spaces created from
          -- the template inherit it (the clone path copies the framing type).
          -- is_template = true → a template callout: it MUST be inserted with
          -- callout.isTemplate = true (the app forces this for callouts created
          -- inside a template; a false template callout is treated as LIVE and
          -- would create an orphan comments room / emit publish info on edit).
          SELECT
            cs.id AS callouts_set_id,
            (SELECT sb2."storageAggregatorId"
               FROM callout co2
               JOIN callout_framing cf2 ON cf2.id = co2."framingId"
               JOIN profile p2 ON p2.id = cf2."profileId"
               JOIN storage_bucket sb2 ON sb2.id = p2."storageBucketId"
               WHERE co2."calloutsSetId" = cs.id
                 AND sb2."storageAggregatorId" IS NOT NULL
               LIMIT 1) AS storage_aggregator_id,
            cs."tagsetTemplateSetId" AS tagset_template_set_id,
            true AS is_template
          FROM template_content_space tcs
          JOIN collaboration c ON c.id = tcs."collaborationId"
          JOIN callouts_set cs ON cs.id = c."calloutsSetId"
          WHERE tcs.level = 0
        LOOP
          -- The new flow-state tagset MUST reference the calloutsSet's flow-state
          -- tagsetTemplate so the client can resolve classification.flowState.
          -- allowedValues. Resolve it DIRECTLY off callouts_set.tagsetTemplateSetId
          -- (not via a sibling callout — that lookup starves on sparse template
          -- callouts sets), matching the contributors migrations (008 fix
          -- 1782998815506 + BackfillContributorsCalloutL0Templates).
          SELECT tt.id, tt."allowedValues"
            INTO flow_state_template_id, allowed_values
            FROM tagset_template tt
            WHERE tt."tagsetTemplateSetId" = rec.tagset_template_set_id
              AND tt.name = 'flow-state'
            LIMIT 1;
          -- Without the flow-state template we cannot place a tab; skip.
          IF flow_state_template_id IS NULL THEN
            CONTINUE;
          END IF;

          -- Resolve the THIRD tab BY POSITION (not by the literal name
          -- 'Subspaces'): the flow-state tab order is the tagsetTemplate's
          -- ordered comma-separated allowedValues, so the third tab is the third
          -- element. This is robust to a renamed / localized third tab.
          third_tab_name := split_part(COALESCE(allowed_values, ''), ',', 3);
          -- No third tab (fewer than three flow states) → nothing to target; skip.
          IF third_tab_name IS NULL OR third_tab_name = '' THEN
            CONTINUE;
          END IF;

          -- Idempotency (1/2): if the third tab's FIRST callout is already a
          -- spaces callout, it is already placed correctly → skip. This is the
          -- re-run no-op for environments already migrated by THIS version.
          first_is_spaces := NULL;
          SELECT (cf.type = 'spaces')
            INTO first_is_spaces
            FROM callout co
            JOIN callout_framing cf ON cf.id = co."framingId"
            JOIN classification cl ON cl.id = co."classificationId"
            JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
            WHERE co."calloutsSetId" = rec.callouts_set_id
              AND third_tab_name = ANY(string_to_array(t.tags, ','))
            ORDER BY co."sortOrder" ASC
            LIMIT 1;
          IF first_is_spaces IS TRUE THEN
            CONTINUE;
          END IF;

          -- FIRST position within the third tab: sortOrder strictly below the
          -- minimum of the callouts already in that tab. Empty tab → -10.
          SELECT COALESCE(MIN(co."sortOrder"), 0) - 10
            INTO next_sort_order
            FROM callout co
            JOIN classification cl ON cl.id = co."classificationId"
            JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
            WHERE co."calloutsSetId" = rec.callouts_set_id
              AND third_tab_name = ANY(string_to_array(t.tags, ','));

          -- Re-run repositioning: if a prior run of THIS migration already left a
          -- default-shape spaces callout in this calloutsSet (tagged a
          -- since-renamed tab), MOVE it into the third tab at first position
          -- rather than inserting a duplicate. Matched by the migration's own
          -- default shape (generated nameID, PUBLISHED but no publisher, no
          -- comments room) so user-created spaces callouts are never touched.
          existing_callout_id := NULL;
          existing_flowtag_id := NULL;
          SELECT co.id, t.id
            INTO existing_callout_id, existing_flowtag_id
            FROM callout co
            JOIN callout_framing cf ON cf.id = co."framingId"
            JOIN classification cl ON cl.id = co."classificationId"
            JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
            WHERE co."calloutsSetId" = rec.callouts_set_id
              AND cf.type = 'spaces'
              AND co."nameID" LIKE 'subspaces-%'
              AND co."publishedBy" IS NULL
              AND co."commentsId" IS NULL
            ORDER BY co."sortOrder" ASC
            LIMIT 1;
          IF existing_callout_id IS NOT NULL THEN
            UPDATE tagset
              SET tags = third_tab_name, "updatedDate" = NOW()
              WHERE id = existing_flowtag_id;
            UPDATE callout
              SET "sortOrder" = next_sort_order, "updatedDate" = NOW()
              WHERE id = existing_callout_id;
            CONTINUE;
          END IF;

          -- Idempotency (2/2): don't duplicate a spaces callout a user may
          -- already have placed elsewhere in the third tab (not at first, and
          -- not default-shape, so not repositioned above).
          IF EXISTS (
            SELECT 1
            FROM callout co
            JOIN callout_framing cf ON cf.id = co."framingId"
            JOIN classification cl ON cl.id = co."classificationId"
            JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
            WHERE co."calloutsSetId" = rec.callouts_set_id
              AND cf.type = 'spaces'
              AND third_tab_name = ANY(string_to_array(t.tags, ','))
          ) THEN
            CONTINUE;
          END IF;

          -- A fresh insert needs a storage aggregator to bind the callout's
          -- framing storage bucket. Live L0 spaces always have one; an L0
          -- template with no storage-bearing sibling callout (degenerate) is
          -- skipped. The reposition path above needs no aggregator.
          IF rec.storage_aggregator_id IS NULL THEN
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
          new_name_id := 'subspaces-' || left(replace(gen_random_uuid()::text, '-', ''), 8);

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

          -- Framing profile displayName is deliberately 'Subspaces' (preserve the
          -- block name, FR-004g) — NOT 'Spaces'.
          INSERT INTO profile (id,"createdDate","updatedDate",version,"displayName",type,"authorizationId","locationId","storageBucketId")
          VALUES (new_profile_id,NOW(),NOW(),1,'Subspaces','callout-framing',new_profile_auth_id,new_location_id,new_bucket_id);

          INSERT INTO callout_framing (id,"createdDate","updatedDate",version,type,"authorizationId","profileId")
          VALUES (new_framing_id,NOW(),NOW(),1,'spaces',new_framing_auth_id,new_profile_id);

          -- DEFAULT freeform tagset on the framing profile. Every callout profile
          -- has one; ProfileResolverFields.tagset throws ENTITY_NOT_FOUND without it.
          INSERT INTO tagset (id,"createdDate","updatedDate",version,name,type,tags,"authorizationId","profileId")
          VALUES (new_default_tagset_id,NOW(),NOW(),1,'default','freeform','',new_default_tagset_auth_id,new_profile_id);

          INSERT INTO classification (id,"createdDate","updatedDate",version,"authorizationId")
          VALUES (new_classification_id,NOW(),NOW(),1,new_classification_auth_id);

          -- Flow-state classification tagset, tagged with the THIRD tab's
          -- displayName (resolved by position above) and linked to the
          -- calloutsSet's flow-state tagsetTemplate so
          -- classification.flowState.allowedValues resolves.
          INSERT INTO tagset (id,"createdDate","updatedDate",version,name,type,tags,"authorizationId","classificationId","tagsetTemplateId")
          VALUES (new_tagset_id,NOW(),NOW(),1,'flow-state','select-one',third_tab_name,new_tagset_auth_id,new_classification_id,flow_state_template_id);

          INSERT INTO callout_contribution_defaults (id,"createdDate","updatedDate",version)
          VALUES (new_contrib_defaults_id,NOW(),NOW(),1);

          INSERT INTO callout
            (id,"createdDate","updatedDate",version,"nameID","isTemplate",settings,"sortOrder","publishedBy","publishedDate",
             "authorizationId","framingId","classificationId","contributionDefaultsId","commentsId","calloutsSetId")
          VALUES
            (new_callout_id,NOW(),NOW(),1,new_name_id,rec.is_template,spaces_settings,next_sort_order,NULL,NOW(),
             new_callout_auth_id,new_framing_id,new_classification_id,new_contrib_defaults_id,NULL,rec.callouts_set_id);
        END LOOP;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Targeted reversal: remove only the PUBLISHED SPACES callouts in L0 spaces
    // and L0 space content templates that still carry the exact default shape
    // this migration produced (generated 'subspaces-%' nameID, published but no
    // publisher, no comments room) — so user-created spaces callouts are never
    // deleted. Subspace content templates (level != 0) are never targeted by
    // up(), so they are never touched here either. Children are deleted
    // explicitly; deleting the classification cascades its flow-state tagset, and
    // the profile's DEFAULT tagset is removed before the profile
    // (tagset.profileId FK).
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
          FROM (
            -- Reverse both sources the up() targets: L0 live spaces and L0
            -- space content templates.
            SELECT c."calloutsSetId" AS callouts_set_id
            FROM space s
            JOIN collaboration c ON c.id = s."collaborationId"
            WHERE s.level = 0
            UNION ALL
            SELECT c."calloutsSetId"
            FROM template_content_space tcs
            JOIN collaboration c ON c.id = tcs."collaborationId"
            WHERE tcs.level = 0
          ) src
          JOIN callout co ON co."calloutsSetId" = src.callouts_set_id
          JOIN callout_framing cf ON cf.id = co."framingId"
          JOIN profile p ON p.id = cf."profileId"
          LEFT JOIN storage_bucket sb ON sb.id = p."storageBucketId"
          JOIN classification cl ON cl.id = co."classificationId"
          JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
          LEFT JOIN tagset dt ON dt."profileId" = p.id AND dt.name = 'default'
          LEFT JOIN callout_contribution_defaults cd ON cd.id = co."contributionDefaultsId"
          WHERE cf.type = 'spaces'
            AND co."nameID" LIKE 'subspaces-%'
            AND co.settings->>'visibility' = 'published'
            AND co."commentsId" IS NULL
            -- A user-published callout always records a publisher; this migration
            -- leaves publishedBy NULL on a PUBLISHED callout (an anomaly only it
            -- creates). This guard prevents deleting legitimate user-created
            -- spaces callouts that otherwise match the default shape.
            AND co."publishedBy" IS NULL
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
