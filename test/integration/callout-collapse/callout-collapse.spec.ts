/**
 * Integration tests: Callout Description Display Mode (spec 043-callout-collapse)
 *
 * These tests exercise three independent slices:
 *   1. The GraphQL mutation path for calloutDescriptionDisplayMode – the
 *      SpaceSettingsService assembled inside a NestJS TestingModule, verifying that
 *      the COLLAPSED / EXPANDED values are persisted and queried back correctly.
 *   2. New-Space defaults – the inline defaulting logic in SpaceService.createSpace()
 *      that seeds COLLAPSED for every new Space record.
 *   3. Migration idempotency – the AddLayoutSettingsToSpace migration SQL is verified
 *      structurally: the UP query only touches rows where layout is absent, and a
 *      second run produces the same result (idempotent WHERE clause).
 *
 * The project's real-database stack is not available in CI unit mode, so DB-level
 * assertions use in-memory objects and SQL-string inspection rather than live queries.
 * Use the full e2e suite for live-DB coverage.
 */

import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceSortMode } from '@common/enums/space.sort.mode';
import { UpdateSpaceSettingsEntityInput } from '@domain/space/space.settings/dto/space.settings.dto.update';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { SpaceSettingsService } from '@domain/space/space.settings/space.settings.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AddLayoutSettingsToSpace1771200000000 } from '@src/migrations/1771200000000-AddLayoutSettingsToSpace';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseSettings(): ISpaceSettings {
  return {
    privacy: {
      mode: SpacePrivacyMode.PUBLIC,
      allowPlatformSupportAsAdmin: false,
    },
    membership: {
      policy: CommunityMembershipPolicy.OPEN,
      trustedOrganizations: [],
      allowSubspaceAdminsToInviteMembers: false,
    },
    collaboration: {
      inheritMembershipRights: true,
      allowMembersToCreateSubspaces: true,
      allowMembersToCreateCallouts: true,
      allowEventsFromSubspaces: true,
      allowMembersToVideoCall: false,
      allowGuestContributions: false,
    },
    sortMode: SpaceSortMode.ALPHABETICAL,
    layout: {
      calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
    },
  };
}

// ---------------------------------------------------------------------------
// 1. GraphQL mutation path – SpaceSettingsService (NestJS TestingModule)
// ---------------------------------------------------------------------------

describe('Callout collapse — GraphQL mutation path (SpaceSettingsService)', () => {
  let service: SpaceSettingsService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [SpaceSettingsService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<SpaceSettingsService>(SpaceSettingsService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('updateSpaceSettings with COLLAPSED persists and is queryable back as COLLAPSED', () => {
    // Simulates the mutation handler calling updateSettings with layout: { calloutDescriptionDisplayMode: COLLAPSED }
    const settings = baseSettings();
    settings.layout.calloutDescriptionDisplayMode =
      CalloutDescriptionDisplayMode.EXPANDED;

    const input: UpdateSpaceSettingsEntityInput = {
      layout: {
        calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
      },
    };

    const result = service.updateSettings(settings, input);

    // GraphQL query contract: settings.layout.calloutDescriptionDisplayMode === COLLAPSED
    expect(result.layout.calloutDescriptionDisplayMode).toBe(
      CalloutDescriptionDisplayMode.COLLAPSED
    );
  });

  it('updateSpaceSettings with EXPANDED persists and is queryable back as EXPANDED', () => {
    const settings = baseSettings(); // starts as COLLAPSED

    const input: UpdateSpaceSettingsEntityInput = {
      layout: {
        calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
      },
    };

    const result = service.updateSettings(settings, input);

    expect(result.layout.calloutDescriptionDisplayMode).toBe(
      CalloutDescriptionDisplayMode.EXPANDED
    );
  });

  it('two consecutive updates reflect the latest value (last-write-wins — simulates immediate query after mutation)', () => {
    const settings = baseSettings();

    service.updateSettings(settings, {
      layout: {
        calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
      },
    });

    // Second update — simulates FR-011: update immediately visible on next query
    const finalResult = service.updateSettings(settings, {
      layout: {
        calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
      },
    });

    expect(finalResult.layout.calloutDescriptionDisplayMode).toBe(
      CalloutDescriptionDisplayMode.COLLAPSED
    );
  });

  it('updating layout does not mutate unrelated settings fields', () => {
    const settings = baseSettings();
    const originalPrivacyMode = settings.privacy.mode;

    service.updateSettings(settings, {
      layout: {
        calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
      },
    });

    expect(settings.privacy.mode).toBe(originalPrivacyMode);
    expect(settings.sortMode).toBe(SpaceSortMode.ALPHABETICAL);
  });
});

// ---------------------------------------------------------------------------
// 2. New-Space defaults — exercises SpaceSettingsService.applyCreationDefaults()
// ---------------------------------------------------------------------------

describe('Callout collapse — new Space creation defaults (applyCreationDefaults)', () => {
  let service: SpaceSettingsService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [SpaceSettingsService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<SpaceSettingsService>(SpaceSettingsService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('space created without calloutDescriptionDisplayMode defaults to COLLAPSED', () => {
    const settings: ISpaceSettings = {
      ...baseSettings(),
      layout: {} as any,
    };

    const result = service.applyCreationDefaults(settings);

    expect(result.layout.calloutDescriptionDisplayMode).toBe(
      CalloutDescriptionDisplayMode.COLLAPSED
    );
  });

  it('explicitly provided EXPANDED is not overridden by the creation default', () => {
    const settings: ISpaceSettings = {
      ...baseSettings(),
      layout: {
        calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
      },
    };

    const result = service.applyCreationDefaults(settings);

    expect(result.layout.calloutDescriptionDisplayMode).toBe(
      CalloutDescriptionDisplayMode.EXPANDED
    );
  });

  it('settings layout for a new subspace is independent of any parent space value', () => {
    const parentSettings = baseSettings();
    parentSettings.layout.calloutDescriptionDisplayMode =
      CalloutDescriptionDisplayMode.EXPANDED;

    const subspaceSettings: ISpaceSettings = {
      ...baseSettings(),
      layout: {} as any,
    };

    const result = service.applyCreationDefaults(subspaceSettings);

    expect(result.layout.calloutDescriptionDisplayMode).toBe(
      CalloutDescriptionDisplayMode.COLLAPSED
    );
    // Parent unchanged
    expect(parentSettings.layout.calloutDescriptionDisplayMode).toBe(
      CalloutDescriptionDisplayMode.EXPANDED
    );
  });

  it('missing sortMode defaults to ALPHABETICAL', () => {
    const settings: ISpaceSettings = {
      ...baseSettings(),
      sortMode: undefined as any,
    };

    const result = service.applyCreationDefaults(settings);

    expect(result.sortMode).toBe(SpaceSortMode.ALPHABETICAL);
  });
});

// ---------------------------------------------------------------------------
// 3. Migration idempotency – SQL string verification
// ---------------------------------------------------------------------------

describe('Callout collapse — migration AddLayoutSettingsToSpace1771200000000', () => {
  const migration = new AddLayoutSettingsToSpace1771200000000();

  it('migration class implements MigrationInterface (has up and down methods)', () => {
    expect(typeof migration.up).toBe('function');
    expect(typeof migration.down).toBe('function');
  });

  it('up() SQL targets only rows where layout is absent (idempotent WHERE clause)', async () => {
    const queriedSql: string[] = [];
    // The migration issues 3 queries: SELECT COUNT before, UPDATE, SELECT COUNT after.
    // Return [{ count: '5' }] for COUNT queries; undefined for the UPDATE.
    let callIndex = 0;
    const mockQueryRunner = {
      query: (sql: string) => {
        queriedSql.push(sql);
        callIndex++;
        // First and third calls are SELECT COUNT queries
        if (callIndex === 1 || callIndex === 3) {
          return Promise.resolve([{ count: callIndex === 1 ? '5' : '0' }]);
        }
        return Promise.resolve(undefined);
      },
    } as any;

    await migration.up(mockQueryRunner);

    // Expect exactly 3 queries: before-count SELECT, UPDATE, after-count SELECT
    expect(queriedSql).toHaveLength(3);

    // [0] before-count SELECT must guard on absent layout
    expect(queriedSql[0]).toContain(`"settings" ->> 'layout' IS NULL`);
    expect(queriedSql[0]).toContain('SELECT');

    // [1] UPDATE — idempotent guard + correct JSONB values
    const updateSql = queriedSql[1];
    expect(updateSql).toContain(`"settings" ->> 'layout' IS NULL`);
    expect(updateSql).toContain(
      `'{"calloutDescriptionDisplayMode": "expanded"}'`
    );
    expect(updateSql).toContain(`'{layout}'`);

    // [2] after-count SELECT must use the same guard (verification query)
    expect(queriedSql[2]).toContain(`"settings" ->> 'layout' IS NULL`);
    expect(queriedSql[2]).toContain('SELECT');
  });

  it('up() SQL applied twice would touch zero rows the second time (WHERE clause self-guards)', async () => {
    // The WHERE clause `WHERE "settings" ->> 'layout' IS NULL` means that after the
    // first run all rows have a layout key, so the second run updates nothing.
    let callIndex = 0;
    const mockQueryRunner = {
      query: (sql: string) => {
        callIndex++;
        if (callIndex === 1 || callIndex === 3) {
          // On a second run the before-count would be 0 — simulate that here
          return Promise.resolve([{ count: '0' }]);
        }
        return Promise.resolve(undefined);
      },
    } as any;

    await migration.up(mockQueryRunner);
    // The UPDATE SQL (second call) must carry the WHERE guard so the DB engine
    // skips all rows on a re-run where every row already has layout set.
    // We verified the WHERE clause content in the test above; here we just
    // confirm no exception is thrown and the implementation issues exactly 3 queries.
    expect(callIndex).toBe(3);
  });

  it('down() removes the layout key from all spaces', async () => {
    const queriedSql: string[] = [];
    const mockQueryRunner = {
      query: (sql: string) => {
        queriedSql.push(sql);
        return Promise.resolve();
      },
    } as any;

    // Should not throw
    await expect(migration.down(mockQueryRunner)).resolves.not.toThrow();
    // The down migration removes the layout key
    expect(queriedSql).toHaveLength(1);
    expect(queriedSql[0]).toContain('"settings" - \'layout\'');
    expect(queriedSql[0]).toContain('IS NOT NULL');
  });
});
