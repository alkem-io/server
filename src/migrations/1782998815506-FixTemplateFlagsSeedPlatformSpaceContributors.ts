import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Follow-up data repair to BackfillContributorsCalloutL0Community
 * (workspace#008-contributor-collection-callout, US6 / FR-023, FR-024).
 *
 * Three steps:
 *
 * 1. isTemplate FLAG REPAIR. The app sets `isTemplate = true` on every callout
 *    created inside a template (collaboration.service.ts propagates the
 *    collaboration flag; template.content.space.service.ts forces it), but
 *    legacy data — and the 25 template callouts inserted by the previous
 *    backfill — carry `false`. A `false` template callout is treated as LIVE:
 *    the first updateCallout on it creates an orphan Matrix comments room, a
 *    visibility toggle records publish info / can emit notifications for
 *    template content, the CONTRIBUTORS template-edit exemption does not
 *    apply, and callout transfer is not blocked. Repaired structurally:
 *    every callout whose calloutsSet belongs to a template_content_space
 *    collaboration (any level), every standalone callout template
 *    (template.calloutId), and the template_content_space collaborations'
 *    own `isTemplate` flag.
 *
 * 2. LEVEL REPAIR on the platform default space templates. The platform's
 *    PLATFORM_SPACE and PLATFORM_SPACE_TUTORIALS template defaults point (on
 *    environments bootstrapped before the level semantics were fixed) to
 *    template_content_space rows with level = 1, although bootstrap declares
 *    them level 0. Because of that, the previous backfill (scoped to
 *    level = 0) never seeded the platform default template, so newly created
 *    L0 spaces using the default get NO contributors callout while migrated
 *    existing spaces have one. Both defaults are root content spaces
 *    (parentSpaceId IS NULL); set them to level 0. The templates are resolved
 *    BY THE PLATFORM DEFAULTS CHAIN (platform → templates_manager →
 *    template_default), never by hard-coded IDs, so this works on any
 *    database; if the chain resolves nothing (fresh DB where migrations run
 *    before bootstrap) the step is a no-op.
 *
 * 3. SEED the PLATFORM_SPACE default template's content space with one
 *    PUBLISHED CONTRIBUTORS callout at the FIRST position of its SECOND
 *    flow-state tab — the same shape, placement rule, and idempotency guards
 *    as the previous backfill, with two deliberate differences:
 *      - `isTemplate` is inserted as TRUE (it is a template callout);
 *      - the flow-state tagsetTemplate is resolved DIRECTLY via
 *        callouts_set."tagsetTemplateSetId" (the previous sibling-callout
 *        lookup starves when the callouts set has few/no callouts — the
 *        platform default has a single 'welcome' callout).
 *    PLATFORM_SPACE_TUTORIALS is intentionally NOT seeded: tutorials callouts
 *    are merged ADDITIVELY on top of whichever space template was chosen
 *    (space.service.ts, addTutorialCallouts), so seeding it would duplicate
 *    the contributors callout on every tutorials-enabled creation — and its
 *    flow has a single state ('Home'), so there is no second tab to target.
 *
 * Idempotency / re-run (safe to run repeatedly, incl. on fresh installs where
 * bootstrap already created a level-0 default that the previous migration
 * seeded):
 *   - flag/level UPDATEs are no-ops once applied;
 *   - the seed skips if the second tab's first callout is already a
 *     contributors callout, repositions a default-shape one left by a prior
 *     run instead of duplicating, skips if a user-created contributors
 *     callout already sits in the second tab, and skips (no insert) when no
 *     storage aggregator is reachable.
 *
 * ⚠️ REQUIRED POST-STEP (rollout runbook): as with the previous backfill, the
 * inserted callout carries EMPTY authorization policies. Run the platform
 * authorization reset (GraphQL `mutation { authorizationPolicyResetAll }` as
 * a global admin) after this migration so it becomes readable.
 *
 * down(): removes only the default-shape contributors callout from the
 * PLATFORM_SPACE default template's content space. The flag and level repairs
 * are NOT reverted — they align data with invariants the application already
 * enforces on creation, and the pre-repair state is not recoverable.
 *
 * Validate with `.scripts/migrations/run_validate_migration.sh` against a DB
 * copy before release.
 */
export class FixTemplateFlagsSeedPlatformSpaceContributors1782998815506
  implements MigrationInterface
{
  name = 'FixTemplateFlagsSeedPlatformSpaceContributors1782998815506';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Step 1: isTemplate flag repair ────────────────────────────────────
    // Callouts living in a template content space's callouts set (any level).
    await queryRunner.query(`
      UPDATE callout co
      SET "isTemplate" = true, "updatedDate" = NOW()
      FROM template_content_space tcs
      JOIN collaboration c ON c.id = tcs."collaborationId"
      WHERE co."calloutsSetId" = c."calloutsSetId"
        AND co."isTemplate" = false;
    `);
    // Standalone callout templates (template.calloutId). All-true today on
    // every checked environment; kept for completeness.
    await queryRunner.query(`
      UPDATE callout co
      SET "isTemplate" = true, "updatedDate" = NOW()
      FROM template t
      WHERE t."calloutId" = co.id
        AND co."isTemplate" = false;
    `);
    // The template content spaces' collaborations themselves.
    await queryRunner.query(`
      UPDATE collaboration c
      SET "isTemplate" = true, "updatedDate" = NOW()
      FROM template_content_space tcs
      WHERE tcs."collaborationId" = c.id
        AND c."isTemplate" = false;
    `);

    // ── Step 2: level repair on the platform default space templates ─────
    // Root content spaces only (parentSpaceId IS NULL) — both defaults are
    // roots; the guard keeps a mis-wired default from corrupting a subtree.
    await queryRunner.query(`
      UPDATE template_content_space tcs
      SET level = 0, "updatedDate" = NOW()
      FROM platform p
      JOIN templates_manager tm ON tm.id = p."templatesManagerId"
      JOIN template_default td ON td."templatesManagerId" = tm.id
      JOIN template t ON t.id = td."templateId"
      WHERE tcs.id = t."contentSpaceId"
        AND td.type IN ('platform-space', 'platform-space-tutorials')
        AND tcs."parentSpaceId" IS NULL
        AND tcs.level <> 0;
    `);

    // ── Step 3: seed the PLATFORM_SPACE default with a contributors callout ─
    await queryRunner.query(`
      DO $$
      DECLARE
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
        -- Resolve the PLATFORM_SPACE default template's callouts set via the
        -- platform defaults chain (works on any database; no hard-coded IDs).
        SELECT cs.id, cs."tagsetTemplateSetId"
          INTO target_cs_id, tts_id
          FROM platform p
          JOIN templates_manager tm ON tm.id = p."templatesManagerId"
          JOIN template_default td ON td."templatesManagerId" = tm.id
          JOIN template t ON t.id = td."templateId"
          JOIN template_content_space tcs ON tcs.id = t."contentSpaceId"
          JOIN collaboration c ON c.id = tcs."collaborationId"
          JOIN callouts_set cs ON cs.id = c."calloutsSetId"
          WHERE td.type = 'platform-space'
          LIMIT 1;
        -- Fresh DB where migrations run before bootstrap → nothing to seed;
        -- bootstrap will create the default template itself.
        IF target_cs_id IS NULL THEN
          RETURN;
        END IF;

        -- Flow-state tagsetTemplate, resolved DIRECTLY off the callouts set
        -- (not via a sibling callout, which starves on sparse callout sets).
        SELECT tt.id, tt."allowedValues"
          INTO flow_state_template_id, allowed_values
          FROM tagset_template tt
          WHERE tt."tagsetTemplateSetId" = tts_id
            AND tt.name = 'flow-state'
          LIMIT 1;
        IF flow_state_template_id IS NULL THEN
          RETURN;
        END IF;

        -- SECOND tab BY POSITION (robust to a renamed / localized tab).
        second_tab_name := split_part(COALESCE(allowed_values, ''), ',', 2);
        IF second_tab_name IS NULL OR second_tab_name = '' THEN
          RETURN;
        END IF;

        -- Idempotency (1/2): second tab's FIRST callout already contributors
        -- (e.g. fresh install seeded by the previous migration) → done.
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
          RETURN;
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
        -- prior run (wrong tab / not first) is MOVED, not duplicated. Step 1
        -- already set its isTemplate flag.
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
          RETURN;
        END IF;

        -- Idempotency (2/2): a contributors callout someone already placed in
        -- the second tab (not default-shape) → don't duplicate.
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
          RETURN;
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
          RETURN;
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

        -- isTemplate = TRUE: this is a template callout (unlike the live-space
        -- inserts of the previous backfill).
        INSERT INTO callout
          (id,"createdDate","updatedDate",version,"nameID","isTemplate",settings,"sortOrder","publishedBy","publishedDate",
           "authorizationId","framingId","classificationId","contributionDefaultsId","commentsId","calloutsSetId")
        VALUES
          (new_callout_id,NOW(),NOW(),1,new_name_id,true,contributors_settings,next_sort_order,NULL,NOW(),
           new_callout_auth_id,new_framing_id,new_classification_id,new_contrib_defaults_id,NULL,target_cs_id);
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Targeted reversal of step 3 only: remove the default-shape contributors
    // callout from the PLATFORM_SPACE default template's content space (same
    // default-shape guards as the previous migration's down(), so a
    // user-created contributors callout is never deleted). Steps 1 and 2 are
    // data repairs aligning legacy rows with invariants the application
    // enforces on creation; the pre-repair state carries no information worth
    // restoring and is NOT reverted.
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
          FROM platform pl
          JOIN templates_manager tm ON tm.id = pl."templatesManagerId"
          JOIN template_default td ON td."templatesManagerId" = tm.id
          JOIN template tpl ON tpl.id = td."templateId"
          JOIN template_content_space tcs ON tcs.id = tpl."contentSpaceId"
          JOIN collaboration c ON c.id = tcs."collaborationId"
          JOIN callout co ON co."calloutsSetId" = c."calloutsSetId"
          JOIN callout_framing cf ON cf.id = co."framingId"
          JOIN profile p ON p.id = cf."profileId"
          LEFT JOIN storage_bucket sb ON sb.id = p."storageBucketId"
          JOIN classification cl ON cl.id = co."classificationId"
          JOIN tagset t ON t."classificationId" = cl.id AND t.name = 'flow-state'
          LEFT JOIN tagset dt ON dt."profileId" = p.id AND dt.name = 'default'
          LEFT JOIN callout_contribution_defaults cd ON cd.id = co."contributionDefaultsId"
          WHERE td.type = 'platform-space'
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
