import { ActorType } from '@common/enums/actor.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { SpaceCollectionCardVariant } from '@common/enums/space.collection.card.variant';
import { ValidationException } from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { mergeCalloutSettings } from '@domain/collaboration/callout/callout.settings.merge';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { actorContextData } from '@test/data/actorContext.mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { cloneDeep } from 'lodash';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { DefaultCalloutSettings } from '../callout-settings/callout.settings.default';
import { Callout } from './callout.entity';
import { CalloutService } from './callout.service';

type FramingServiceCtor = new (...args: unknown[]) => CalloutFramingService;

/**
 * A REAL CalloutFramingService: the settings normalizers and the up-front
 * off-kind block check run their production code. Its injected collaborators
 * are all left undefined — the pure normalizers never touch them — and only
 * the two I/O methods (framing create/update) are replaced per test.
 */
const newRealFramingService = () =>
  new (CalloutFramingService as unknown as FramingServiceCtor)(
    ...(Array(13).fill(undefined) as unknown[])
  );

/**
 * Wiring tests for the card-variant and selection normalizers at both
 * CalloutService call sites (create + update), end to end through the real
 * settings merge and the real normalizers. The normalizers' own validation
 * matrix lives in callout.framing.spaces.validation.spec.ts /
 * callout.framing.selection.validation.spec.ts.
 */
describe('CalloutService — card-variant settings wiring', () => {
  let service: CalloutService;
  let module: TestingModule;
  let framingService: CalloutFramingService;
  let calloutRepo: any;
  let scopeGuardSpy: ReturnType<typeof vi.spyOn>;

  const mockContributionDefaultsService = {
    createCalloutContributionDefaults: vi.fn(),
    updateCalloutContributionDefaults: vi.fn(),
  };

  const mockClassificationService = {
    createClassification: vi.fn().mockReturnValue({ id: 'cls-1' }),
    updateClassification: vi.fn(),
  };

  /** Host space with the given direct subspaces, resolved via calloutsSet. */
  function mockHostSpace(subspaceIds: string[]) {
    calloutRepo.manager = {
      findOne: vi.fn().mockResolvedValue({
        id: 'host-space-1',
        subspaces: subspaceIds.map(id => ({ id })),
      }),
      createQueryBuilder: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ spaceId: 'host-space-1' }),
      }),
    };
  }

  beforeEach(async () => {
    vi.restoreAllMocks();

    framingService = newRealFramingService();
    // I/O only: the framing children (profile, whiteboard, …) are not under
    // test. Every normalizer stays real (spied, calling through).
    vi.spyOn(framingService, 'createCalloutFraming').mockImplementation(
      async data =>
        ({
          id: 'framing-1',
          type: data.type ?? CalloutFramingType.NONE,
          profile: { storageBucket: { id: 'sb-1' } },
        }) as any
    );
    vi.spyOn(framingService, 'updateCalloutFraming').mockImplementation(
      async (framing, data) =>
        ({ ...framing, type: data.type ?? framing.type }) as any
    );
    vi.spyOn(framingService, 'validateAndNormalizeSpacesSettings');
    vi.spyOn(framingService, 'validateAndNormalizeSelectionSettings');

    vi.spyOn(Callout, 'create').mockImplementation((input: any) => {
      const entity = new Callout();
      Object.assign(entity, input);
      return entity as any;
    });

    module = await Test.createTestingModule({
      providers: [
        CalloutService,
        repositoryProviderMockFactory(Callout),
        MockCacheManager,
        MockWinstonProvider,
        { provide: CalloutFramingService, useValue: framingService },
        {
          provide: RoleSetService,
          useValue: {
            getUsersWithRole: vi.fn().mockResolvedValue([]),
            getOrganizationsWithRole: vi.fn().mockResolvedValue([]),
            getVirtualContributorsWithRole: vi.fn().mockResolvedValue([]),
          },
        },
      ],
    })
      .useMocker(token => {
        if (
          typeof token === 'function' &&
          token.name === 'CalloutContributionDefaultsService'
        ) {
          return mockContributionDefaultsService;
        }
        if (
          typeof token === 'function' &&
          token.name === 'ClassificationService'
        ) {
          return mockClassificationService;
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(CalloutService);
    // Call-through spy on the private host-scope guard.
    scopeGuardSpy = vi.spyOn(service as any, 'validateSelectionScopeGuard');

    calloutRepo = module.get<any>(getRepositoryToken(Callout));
    vi.mocked(calloutRepo.save).mockImplementation(async (c: any) => c);
    const storageAggregatorResolverService = module.get(
      StorageAggregatorResolverService
    );
    vi.mocked(
      storageAggregatorResolverService.getStorageAggregatorForCallout
    ).mockResolvedValue({ id: 'agg-1' } as any);
  });

  function makeCalloutInput(
    type: CalloutFramingType,
    framingSettings: Record<string, unknown>
  ) {
    return {
      nameID: 'test-callout',
      framing: {
        type,
        profile: { displayName: 'Test', tagsets: [] },
        tags: [],
      },
      settings: {
        framing: framingSettings,
        contribution: { allowedTypes: [] },
      },
      contributions: [],
      classification: {},
    } as any;
  }

  const makeSpacesCalloutInput = (spaces?: {
    cardVariant?: SpaceCollectionCardVariant;
  }) => makeCalloutInput(CalloutFramingType.SPACES, { spaces });

  const create = (input: any) =>
    service.createCallout(
      input,
      [],
      { id: 'agg-1' } as any,
      actorContextData.actorContext,
      'user-1'
    );

  describe('createCallout', () => {
    it('persists an EXPANDED card variant on a SPACES callout', async () => {
      const result = await create(
        makeSpacesCalloutInput({
          cardVariant: SpaceCollectionCardVariant.EXPANDED,
        })
      );

      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.EXPANDED
      );
      expect(
        framingService.validateAndNormalizeSpacesSettings
      ).toHaveBeenCalledWith(CalloutFramingType.SPACES, expect.anything(), {
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });
    });

    it('defaults to COMPACT on a SPACES callout with no spaces settings', async () => {
      const result = await create(makeSpacesCalloutInput(undefined));

      expect(result.settings.framing.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.COMPACT,
      });
    });

    it('defaults to COMPACT on a SPACES callout with an empty spaces block ({})', async () => {
      // `spaces: {}` — the shape a client sends when it builds the block but
      // leaves `cardVariant` undefined (dropped by JSON variable serialization).
      const result = await create(makeSpacesCalloutInput({}));

      expect(result.settings.framing.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.COMPACT,
      });
    });

    it('rejects card-variant settings on a NONE callout before creating any framing', async () => {
      await expect(
        create(
          makeCalloutInput(CalloutFramingType.NONE, {
            spaces: { cardVariant: SpaceCollectionCardVariant.EXPANDED },
          })
        )
      ).rejects.toThrow(
        'Card-variant settings can only be set when framing.type = SPACES.'
      );
      expect(framingService.createCalloutFraming).not.toHaveBeenCalled();
      expect(calloutRepo.save).not.toHaveBeenCalled();
    });

    it('rejects selection settings on a NONE callout before creating any framing', async () => {
      await expect(
        create(
          makeCalloutInput(CalloutFramingType.NONE, {
            selection: { mode: CalloutSelectionMode.AUTO },
          })
        )
      ).rejects.toThrow(ValidationException);
      expect(framingService.createCalloutFraming).not.toHaveBeenCalled();
    });
  });

  describe('updateCallout', () => {
    function existingCallout(
      type: CalloutFramingType,
      framingSettings: Record<string, unknown>
    ) {
      return {
        id: 'callout-1',
        framing: { id: 'framing-1', type },
        contributionDefaults: { id: 'defaults-1' },
        settings: {
          contribution: { allowedTypes: [] },
          // commentsEnabled false: no comment room is created on update.
          framing: { commentsEnabled: false, ...framingSettings },
        },
        classification: { id: 'class-1', tagsets: [] },
        calloutsSet: { id: 'cs-1' },
        isTemplate: false,
      } as any;
    }

    function existingSpacesCallout(
      spaces?: { cardVariant: SpaceCollectionCardVariant },
      selection: { mode: CalloutSelectionMode; selectedIds: string[] } = {
        mode: CalloutSelectionMode.AUTO,
        selectedIds: [],
      }
    ) {
      return existingCallout(CalloutFramingType.SPACES, { spaces, selection });
    }

    async function update(callout: any, updateData: any) {
      vi.mocked(calloutRepo.findOne).mockResolvedValue(callout);
      return service.updateCallout(
        callout,
        updateData,
        actorContextData.actorContext,
        'user-1'
      );
    }

    it('keeps stored EXPANDED when the update omits spaces', async () => {
      const result = await update(
        existingSpacesCallout({
          cardVariant: SpaceCollectionCardVariant.EXPANDED,
        }),
        { settings: { framing: { commentsEnabled: false } } }
      );

      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.EXPANDED
      );
    });

    it('keeps stored EXPANDED when the update sends spaces: {}', async () => {
      const result = await update(
        existingSpacesCallout({
          cardVariant: SpaceCollectionCardVariant.EXPANDED,
        }),
        { settings: { framing: { spaces: {} } } }
      );

      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.EXPANDED
      );
    });

    it('keeps stored EXPANDED when the update sends spaces: null', async () => {
      const result = await update(
        existingSpacesCallout({
          cardVariant: SpaceCollectionCardVariant.EXPANDED,
        }),
        { settings: { framing: { spaces: null } } }
      );

      expect(result.settings.framing.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });
    });

    it('a legacy callout with no stored block sending spaces: {} persists COMPACT', async () => {
      const result = await update(existingSpacesCallout(undefined), {
        settings: { framing: { spaces: {} } },
      });

      expect(result.settings.framing.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.COMPACT,
      });
    });

    it('keeps a stored CUSTOM selection when the update sends selection: null', async () => {
      // Stored ids are stale (no longer subspaces of the host): they must stay
      // inert — kept as stored, never re-validated (025 FR-008).
      mockHostSpace([]);
      const result = await update(
        existingSpacesCallout(
          { cardVariant: SpaceCollectionCardVariant.EXPANDED },
          { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['a', 'b'] }
        ),
        { settings: { framing: { selection: null } } }
      );

      expect(result.settings.framing.selection).toEqual({
        mode: CalloutSelectionMode.CUSTOM,
        selectedIds: ['a', 'b'],
      });
      expect(scopeGuardSpy).not.toHaveBeenCalled();
    });

    it('selectedIds: null with stale stored ids succeeds without running the scope guard', async () => {
      mockHostSpace([]); // 'stale-1' is no longer a subspace of the host
      const result = await update(
        existingSpacesCallout(
          { cardVariant: SpaceCollectionCardVariant.COMPACT },
          { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['stale-1'] }
        ),
        {
          settings: {
            framing: {
              selection: { selectedIds: null },
              spaces: { cardVariant: SpaceCollectionCardVariant.EXPANDED },
            },
          },
        }
      );

      expect(result.settings.framing.selection).toEqual({
        mode: CalloutSelectionMode.CUSTOM,
        selectedIds: ['stale-1'],
      });
      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.EXPANDED
      );
      expect(scopeGuardSpy).not.toHaveBeenCalled();
    });

    it('omitting selectedIds does not run the scope guard', async () => {
      await update(
        existingSpacesCallout({
          cardVariant: SpaceCollectionCardVariant.COMPACT,
        }),
        {
          settings: {
            framing: {
              spaces: { cardVariant: SpaceCollectionCardVariant.EXPANDED },
            },
          },
        }
      );

      expect(scopeGuardSpy).not.toHaveBeenCalled();
    });

    it('runs the selection scope guard on submitted selectedIds, independently of spaces', async () => {
      mockHostSpace(['sub-1']);
      const result = await update(
        existingSpacesCallout({
          cardVariant: SpaceCollectionCardVariant.COMPACT,
        }),
        {
          settings: {
            framing: {
              spaces: { cardVariant: SpaceCollectionCardVariant.EXPANDED },
              selection: {
                mode: CalloutSelectionMode.CUSTOM,
                selectedIds: ['sub-1'],
              },
            },
          },
        }
      );

      expect(scopeGuardSpy).toHaveBeenCalledTimes(1);
      expect(scopeGuardSpy).toHaveBeenCalledWith(
        CalloutFramingType.SPACES,
        { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['sub-1'] },
        'host-space-1'
      );
      // Writing spaces never disturbs the sibling selection block.
      expect(result.settings.framing.selection).toEqual({
        mode: CalloutSelectionMode.CUSTOM,
        selectedIds: ['sub-1'],
      });
      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.EXPANDED
      );
    });

    it('rejects a submitted out-of-scope selectedId via the scope guard', async () => {
      mockHostSpace(['sub-1']);
      await expect(
        update(existingSpacesCallout(undefined), {
          settings: {
            framing: {
              selection: {
                mode: CalloutSelectionMode.CUSTOM,
                selectedIds: ['foreign'],
              },
            },
          },
        })
      ).rejects.toThrow(ValidationException);
      expect(scopeGuardSpy).toHaveBeenCalledTimes(1);
      expect(calloutRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an off-kind spaces block on a WHITEBOARD -> NONE change before touching the framing', async () => {
      await expect(
        update(existingCallout(CalloutFramingType.WHITEBOARD, {}), {
          framing: { type: CalloutFramingType.NONE },
          settings: {
            framing: {
              spaces: { cardVariant: SpaceCollectionCardVariant.EXPANDED },
            },
          },
        })
      ).rejects.toThrow(
        'Card-variant settings can only be set when framing.type = SPACES.'
      );
      // updateCalloutFraming deletes the whiteboard on a type change; a
      // rejected request must never reach it.
      expect(framingService.updateCalloutFraming).not.toHaveBeenCalled();
      expect(calloutRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an off-kind selection block on a WHITEBOARD -> NONE change before touching the framing', async () => {
      await expect(
        update(existingCallout(CalloutFramingType.WHITEBOARD, {}), {
          framing: { type: CalloutFramingType.NONE },
          settings: {
            framing: { selection: { mode: CalloutSelectionMode.AUTO } },
          },
        })
      ).rejects.toThrow(
        'Selection settings can only be set when framing.type ∈ {CONTRIBUTORS, SPACES}.'
      );
      expect(framingService.updateCalloutFraming).not.toHaveBeenCalled();
    });

    it('validates the settings blocks against the TARGET framing type', async () => {
      // Stored type NONE, target SPACES: a spaces block is valid for the target.
      const result = await update(
        existingCallout(CalloutFramingType.NONE, {}),
        {
          framing: { type: CalloutFramingType.SPACES },
          settings: {
            framing: {
              spaces: { cardVariant: SpaceCollectionCardVariant.EXPANDED },
            },
          },
        }
      );

      expect(framingService.updateCalloutFraming).toHaveBeenCalledTimes(1);
      expect(result.settings.framing.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });
    });

    it('contributors.mapView: null still clears the stored map view', async () => {
      const result = await update(
        existingCallout(CalloutFramingType.CONTRIBUTORS, {
          contributors: {
            contributorTypes: [ActorType.USER],
            mapView: { longitude: 1, latitude: 2, zoom: 3 },
          },
          selection: { mode: CalloutSelectionMode.AUTO, selectedIds: [] },
        }),
        { settings: { framing: { contributors: { mapView: null } } } }
      );

      expect(result.settings.framing.contributors?.mapView).toBeNull();
      expect(result.settings.framing.contributors?.contributorTypes).toEqual([
        ActorType.USER,
      ]);
    });
  });
});

/**
 * Exercises the REAL settings merge (mergeCalloutSettings, exactly as
 * CalloutService's createCalloutSettings/updateCallout run it) followed by
 * the REAL normalizers — not the mocked wiring above. Both mocked wiring
 * suites and the normalizers' own unit specs can stay green while the actual
 * merge→normalize interaction is broken, because neither feeds a normalizer
 * the true post-merge shape.
 *
 * The normalizers have no dependency on CalloutFramingService's injected
 * collaborators, so a direct instantiation (bypassing Nest DI) is sufficient.
 */
describe('CalloutService settings merge -> real CalloutFramingService normalizers (regression)', () => {
  const realFramingService = newRealFramingService();

  const storedSpacesFraming = () =>
    ({
      commentsEnabled: true,
      selection: { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['a', 'b'] },
      spaces: { cardVariant: SpaceCollectionCardVariant.EXPANDED },
    }) as any;

  describe('spaces block', () => {
    it('create: spaces: {} persists { cardVariant: COMPACT }, never a block without cardVariant', () => {
      const calloutSettings = cloneDeep(DefaultCalloutSettings) as any;
      const settingsData = { framing: { spaces: {} } };

      mergeCalloutSettings(calloutSettings, settingsData);
      expect(calloutSettings.framing.spaces).toEqual({});

      const normalized = realFramingService.validateAndNormalizeSpacesSettings(
        CalloutFramingType.SPACES,
        calloutSettings.framing,
        settingsData.framing.spaces
      );
      expect(normalized.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.COMPACT,
      });
    });

    it('update on a legacy callout with no stored block: spaces: {} persists { cardVariant: COMPACT }', () => {
      const storedFraming = {
        commentsEnabled: true,
        selection: { mode: CalloutSelectionMode.AUTO, selectedIds: [] },
        // No `spaces` key stored — the pre-existing-row shape.
      } as any;
      const updateData = { framing: { spaces: {} } };

      const merged = mergeCalloutSettings(storedFraming, updateData.framing);
      expect(merged.spaces).toEqual({});

      const normalized = realFramingService.validateAndNormalizeSpacesSettings(
        CalloutFramingType.SPACES,
        merged,
        updateData.framing.spaces
      );
      expect(normalized.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.COMPACT,
      });
    });

    it('create: cardVariant: null persists COMPACT, never null', () => {
      const calloutSettings = cloneDeep(DefaultCalloutSettings) as any;
      const settingsData = { framing: { spaces: { cardVariant: null } } };

      mergeCalloutSettings(calloutSettings, settingsData);

      const normalized = realFramingService.validateAndNormalizeSpacesSettings(
        CalloutFramingType.SPACES,
        calloutSettings.framing,
        settingsData.framing.spaces
      );
      expect(normalized.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.COMPACT,
      });
    });

    it('update: cardVariant: null on a callout stored as EXPANDED leaves EXPANDED unchanged', () => {
      const storedFraming = storedSpacesFraming();
      const updateData = { framing: { spaces: { cardVariant: null } } };

      const merged = mergeCalloutSettings(storedFraming, updateData.framing);
      // The merge itself keeps the stored scalar — no pre-merge snapshot needed.
      expect(merged.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });

      const normalized = realFramingService.validateAndNormalizeSpacesSettings(
        CalloutFramingType.SPACES,
        merged,
        updateData.framing.spaces
      );
      expect(normalized.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });
    });
  });

  // The same null hazard exists on every other nullable scalar leaf of the
  // settings input; the shared merge rule closes the class, not one field.
  describe('sibling leaves', () => {
    it('update: selection: { mode: null } keeps the stored CUSTOM mode and its ids', () => {
      const storedFraming = storedSpacesFraming();
      const updateData = { framing: { selection: { mode: null } } };

      const merged = mergeCalloutSettings(storedFraming, updateData.framing);
      expect(merged.selection.mode).toBe(CalloutSelectionMode.CUSTOM);

      const normalized =
        realFramingService.validateAndNormalizeSelectionSettings(
          CalloutFramingType.SPACES,
          merged,
          updateData.framing.selection as any
        );
      expect(normalized.selection).toEqual({
        mode: CalloutSelectionMode.CUSTOM,
        selectedIds: ['a', 'b'],
      });
    });

    it('update: selection: { mode: null } on a legacy callout with no stored block persists AUTO, never null', () => {
      const storedFraming = { commentsEnabled: true } as any;
      const updateData = { framing: { selection: { mode: null } } };

      const merged = mergeCalloutSettings(storedFraming, updateData.framing);
      const normalized =
        realFramingService.validateAndNormalizeSelectionSettings(
          CalloutFramingType.CONTRIBUTORS,
          merged,
          updateData.framing.selection as any
        );
      expect(normalized.selection).toEqual({
        mode: CalloutSelectionMode.AUTO,
        selectedIds: [],
      });
    });

    it('create: selection: {} persists { AUTO, [] }, never a block without a mode', () => {
      const calloutSettings = cloneDeep(DefaultCalloutSettings) as any;
      const settingsData = { framing: { selection: {} } };

      mergeCalloutSettings(calloutSettings, settingsData);
      const normalized =
        realFramingService.validateAndNormalizeSelectionSettings(
          CalloutFramingType.SPACES,
          calloutSettings.framing,
          settingsData.framing.selection as any
        );
      expect(normalized.selection).toEqual({
        mode: CalloutSelectionMode.AUTO,
        selectedIds: [],
      });
    });

    it('update: selectedIds: null keeps the stored ids', () => {
      const storedFraming = storedSpacesFraming();
      const merged = mergeCalloutSettings(storedFraming, {
        selection: { selectedIds: null },
      });
      expect(merged.selection.selectedIds).toEqual(['a', 'b']);
    });

    it('update: commentsEnabled: null keeps the stored boolean', () => {
      const storedFraming = storedSpacesFraming();
      const merged = mergeCalloutSettings(storedFraming, {
        commentsEnabled: null,
      });
      expect(merged.commentsEnabled).toBe(true);
    });

    it('update: visibility: null keeps the stored visibility', () => {
      const stored = {
        visibility: 'PUBLISHED',
        framing: { commentsEnabled: true },
      } as any;
      const merged = mergeCalloutSettings(stored, { visibility: null });
      expect(merged.visibility).toBe('PUBLISHED');
    });

    it('update: framing.spaces: null and framing.selection: null keep the stored blocks', () => {
      const stored = { framing: storedSpacesFraming() } as any;
      const input = { framing: { spaces: null, selection: null } };
      const inputBefore = cloneDeep(input);

      const merged = mergeCalloutSettings(stored, input);
      expect(merged.framing.spaces).toEqual({
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });
      expect(merged.framing.selection).toEqual({
        mode: CalloutSelectionMode.CUSTOM,
        selectedIds: ['a', 'b'],
      });
      // The caller's input is read again after the merge: never mutated.
      expect(input).toEqual(inputBefore);
    });

    it('update: an object-valued leaf can still be cleared with null (contributors.mapView)', () => {
      const stored = {
        framing: {
          commentsEnabled: true,
          contributors: { mapView: { longitude: 1, latitude: 2, zoom: 3 } },
        },
      } as any;
      const merged = mergeCalloutSettings(stored, {
        framing: { contributors: { mapView: null } },
      });
      expect(merged.framing.contributors.mapView).toBeNull();
    });

    it('update: arrays replace wholesale (a shorter list persists as sent)', () => {
      const stored = {
        framing: {
          contributors: { contributorTypes: ['USER', 'ORGANIZATION'] },
        },
      } as any;
      const merged = mergeCalloutSettings(stored, {
        framing: { contributors: { contributorTypes: ['USER'] } },
      });
      expect(merged.framing.contributors.contributorTypes).toEqual(['USER']);
    });
  });
});
