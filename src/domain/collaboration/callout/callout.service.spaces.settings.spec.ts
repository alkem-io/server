import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { SpaceCollectionCardVariant } from '@common/enums/space.collection.card.variant';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { Test, TestingModule } from '@nestjs/testing';
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
import { mergeCalloutSettings } from './callout.settings.merge';

/**
 * Wiring tests for the card-variant normalizer at both CalloutService call
 * sites (create + update). The normalizer's own validation matrix lives in
 * callout.framing.spaces.validation.spec.ts; this file only proves the
 * service passes the right arguments at the right call sites. (A SPACES
 * framing can never change kind — updateCalloutFraming rejects it — so there
 * is no "type changed away from SPACES" case to wire.)
 */
describe('CalloutService — card-variant settings wiring', () => {
  let service: CalloutService;
  let module: TestingModule;

  const mockFramingService = {
    createCalloutFraming: vi.fn(),
    updateCalloutFraming: vi.fn(),
    validateAndNormalizeContributorsSettings: vi.fn((_, s) => s),
    validateAndNormalizeSelectionSettings: vi.fn((_, s, inc) => {
      if (!s.selection) {
        s.selection = { mode: CalloutSelectionMode.AUTO, selectedIds: [] };
      }
      if (inc !== undefined) {
        if (inc.mode !== undefined) s.selection.mode = inc.mode;
        if (inc.selectedIds !== undefined)
          s.selection.selectedIds = inc.selectedIds;
      }
      return s;
    }),
    // Real-shaped simulation of validateAndNormalizeSpacesSettings so the
    // wiring tests below exercise the same contract as the real service.
    validateAndNormalizeSpacesSettings: vi.fn(
      (
        framingType: CalloutFramingType,
        s: any,
        incoming?: { cardVariant?: SpaceCollectionCardVariant }
      ) => {
        const isSpaces = framingType === CalloutFramingType.SPACES;
        if (!isSpaces) {
          delete s.spaces;
          return s;
        }
        // Materialize the block and default `cardVariant` independently, so
        // an already-merged `spaces: {}` (the real production shape at both
        // call sites) is defaulted the same way the real normalizer does.
        if (!s.spaces) {
          s.spaces = {};
        }
        if (s.spaces.cardVariant === undefined) {
          s.spaces.cardVariant = SpaceCollectionCardVariant.COMPACT;
        }
        if (incoming?.cardVariant !== undefined) {
          s.spaces.cardVariant = incoming.cardVariant;
        }
        return s;
      }
    ),
  };

  const mockContributionDefaultsService = {
    createCalloutContributionDefaults: vi.fn(),
    updateCalloutContributionDefaults: vi.fn(),
  };

  const mockClassificationService = {
    createClassification: vi.fn().mockReturnValue({ id: 'cls-1' }),
    updateClassification: vi.fn(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    mockFramingService.validateAndNormalizeSpacesSettings.mockClear();
    mockFramingService.validateAndNormalizeSelectionSettings.mockClear();

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
          token.name === 'CalloutFramingService'
        ) {
          return mockFramingService;
        }
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

    mockFramingService.createCalloutFraming.mockResolvedValue({
      id: 'framing-1',
      type: CalloutFramingType.SPACES,
      profile: { storageBucket: { id: 'sb-1' } },
    });
  });

  function makeSpacesCalloutInput(spaces?: {
    cardVariant?: SpaceCollectionCardVariant;
  }) {
    return {
      nameID: 'test-spaces-callout',
      framing: {
        type: CalloutFramingType.SPACES,
        profile: { displayName: 'Test', tagsets: [] },
        tags: [],
      },
      settings: {
        framing: { spaces },
        contribution: { allowedTypes: [] },
      },
      contributions: [],
      classification: {},
    } as any;
  }

  describe('createCallout', () => {
    it('persists an EXPANDED card variant on a SPACES callout', async () => {
      const result = await service.createCallout(
        makeSpacesCalloutInput({
          cardVariant: SpaceCollectionCardVariant.EXPANDED,
        }),
        [],
        { id: 'agg-1' } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.EXPANDED
      );
      expect(
        mockFramingService.validateAndNormalizeSpacesSettings
      ).toHaveBeenCalledWith(CalloutFramingType.SPACES, expect.anything(), {
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });
    });

    it('defaults to COMPACT on a SPACES callout with no spaces settings', async () => {
      const result = await service.createCallout(
        makeSpacesCalloutInput(undefined),
        [],
        { id: 'agg-1' } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.COMPACT
      );
    });

    it('defaults to COMPACT on a SPACES callout with an empty spaces block ({})', async () => {
      // `spaces: {}` — the shape a client sends when it builds the block but
      // leaves `cardVariant` undefined (dropped by JSON variable serialization).
      const result = await service.createCallout(
        makeSpacesCalloutInput({}),
        [],
        { id: 'agg-1' } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.COMPACT
      );
    });

    it('rejects card-variant settings on a NONE callout and persists nothing', async () => {
      mockFramingService.createCalloutFraming.mockResolvedValue({
        id: 'framing-none',
        type: CalloutFramingType.NONE,
        profile: { storageBucket: { id: 'sb-none' } },
      });
      // Exercise the real rejection shape by having the stub throw, exactly
      // as the real normalizer does for a non-SPACES kind with incoming data.
      mockFramingService.validateAndNormalizeSpacesSettings.mockImplementationOnce(
        () => {
          throw new Error(
            'Card-variant settings can only be set when framing.type = SPACES.'
          );
        }
      );

      const input = {
        nameID: 'test-none-callout',
        framing: {
          type: CalloutFramingType.NONE,
          profile: { displayName: 'Test', tagsets: [] },
          tags: [],
        },
        settings: {
          framing: {
            spaces: { cardVariant: SpaceCollectionCardVariant.EXPANDED },
          },
          contribution: { allowedTypes: [] },
        },
        contributions: [],
        classification: {},
      } as any;

      await expect(
        service.createCallout(
          input,
          [],
          { id: 'agg-1' } as any,
          actorContextData.actorContext,
          'user-1'
        )
      ).rejects.toThrow();
    });
  });

  describe('updateCallout', () => {
    function existingSpacesCallout(spaces?: {
      cardVariant: SpaceCollectionCardVariant;
    }) {
      return {
        id: 'callout-1',
        framing: { id: 'framing-1', type: CalloutFramingType.SPACES },
        contributionDefaults: { id: 'defaults-1' },
        settings: {
          contribution: { allowedTypes: [] },
          framing: {
            commentsEnabled: true,
            spaces,
            selection: { mode: CalloutSelectionMode.AUTO, selectedIds: [] },
          },
        },
        classification: { id: 'class-1', tagsets: [] },
        calloutsSet: { id: 'cs-1' },
        isTemplate: false,
      } as any;
    }

    beforeEach(async () => {
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const calloutRepo = module.get<any>(getRepositoryToken(Callout));
      vi.mocked(calloutRepo.save).mockImplementation(async (c: any) => c);

      const storageAggregatorResolverService = module.get(
        StorageAggregatorResolverService
      );
      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCallout
      ).mockResolvedValue({ id: 'agg-1' } as any);
    });

    it('keeps stored EXPANDED when the update omits spaces', async () => {
      const callout = existingSpacesCallout({
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const calloutRepo = module.get<any>(getRepositoryToken(Callout));
      vi.mocked(calloutRepo.findOne).mockResolvedValue(callout);

      const result = await service.updateCallout(
        callout,
        { settings: { framing: { commentsEnabled: false } } } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.EXPANDED
      );
    });

    it('keeps stored EXPANDED when the update sends spaces: {}', async () => {
      const callout = existingSpacesCallout({
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const calloutRepo = module.get<any>(getRepositoryToken(Callout));
      vi.mocked(calloutRepo.findOne).mockResolvedValue(callout);

      const result = await service.updateCallout(
        callout,
        { settings: { framing: { spaces: {} } } } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.EXPANDED
      );
    });

    it('a legacy callout with no stored block sending spaces: {} persists COMPACT', async () => {
      const callout = existingSpacesCallout(undefined);
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const calloutRepo = module.get<any>(getRepositoryToken(Callout));
      vi.mocked(calloutRepo.findOne).mockResolvedValue(callout);

      const result = await service.updateCallout(
        callout,
        { settings: { framing: { spaces: {} } } } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(result.settings.framing.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.COMPACT
      );
    });

    it('still invokes the selection scope guard exactly as before (independence)', async () => {
      const callout = existingSpacesCallout({
        cardVariant: SpaceCollectionCardVariant.COMPACT,
      });
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const calloutRepo = module.get<any>(getRepositoryToken(Callout));
      vi.mocked(calloutRepo.findOne).mockResolvedValue(callout);
      calloutRepo.manager = {
        findOne: vi.fn().mockResolvedValue({
          id: 'host-space-1',
          subspaces: [{ id: 'sub-1' }],
        }),
        createQueryBuilder: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          getRawOne: vi.fn().mockResolvedValue({ spaceId: 'host-space-1' }),
        }),
      };

      const result = await service.updateCallout(
        callout,
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
        } as any,
        actorContextData.actorContext,
        'user-1'
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
  type FramingServiceCtor = new (...args: unknown[]) => CalloutFramingService;
  const realFramingService = new (
    CalloutFramingService as unknown as FramingServiceCtor
  )(...(Array(13).fill(undefined) as unknown[]));

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
