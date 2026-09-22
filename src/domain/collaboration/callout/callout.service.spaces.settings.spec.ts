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
import { cloneDeep, merge, mergeWith } from 'lodash';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { DefaultCalloutSettings } from '../callout-settings/callout.settings.default';
import { Callout } from './callout.entity';
import { CalloutService } from './callout.service';

/**
 * Wiring tests for the card-variant normalizer at both CalloutService call
 * sites (create + update). The normalizer's own validation matrix lives in
 * callout.framing.spaces.validation.spec.ts; this file only proves the
 * service passes the right arguments at the right call sites and applies the
 * pre-strip on a framing-type change away from SPACES.
 *
 * Mitigates risk R-9 (repos.yaml). Contract: S1-S6.
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

    it('defaults to COMPACT on a SPACES callout with an empty spaces block ({}) — regression for corr-server-1/spec-server-1/sec-server-1', async () => {
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

    it('a legacy callout with no stored block sending spaces: {} persists COMPACT — regression for corr-server-1/spec-server-1/sec-server-1', async () => {
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

    it('removes the block when the framing type changes away from SPACES', async () => {
      const callout = existingSpacesCallout({
        cardVariant: SpaceCollectionCardVariant.EXPANDED,
      });
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const calloutRepo = module.get<any>(getRepositoryToken(Callout));
      vi.mocked(calloutRepo.findOne).mockResolvedValue(callout);
      mockFramingService.updateCalloutFraming.mockResolvedValue({
        id: 'framing-1',
        type: CalloutFramingType.NONE,
      });

      const result = await service.updateCallout(
        callout,
        { framing: { type: CalloutFramingType.NONE } } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(result.settings.framing.spaces).toBeUndefined();
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
 * Exercises the REAL merge (lodash, exactly as CalloutService's
 * createCalloutSettings/updateCallout run it) followed by the REAL
 * CalloutFramingService.validateAndNormalizeSpacesSettings — not the
 * hand-copied stub above. This is the discriminating regression coverage for
 * corr-server-1 / spec-server-1 / sec-server-1: both mocked wiring suites and
 * the normalizer's own unit spec can stay green while the actual
 * merge→normalize interaction is still broken, because neither previously
 * fed the normalizer the true post-merge `spaces: {}` shape.
 *
 * validateAndNormalizeSpacesSettings has no dependency on any of
 * CalloutFramingService's injected collaborators, so a direct instantiation
 * (bypassing Nest DI) is sufficient and keeps this test fast and isolated.
 */
describe('CalloutService settings merge -> real CalloutFramingService.validateAndNormalizeSpacesSettings (regression)', () => {
  type FramingServiceCtor = new (...args: unknown[]) => CalloutFramingService;
  const realFramingService = new (
    CalloutFramingService as unknown as FramingServiceCtor
  )(...(Array(13).fill(undefined) as unknown[]));

  it('createCalloutSettings-shaped merge: spaces: {} persists { cardVariant: COMPACT }, never a block without cardVariant', () => {
    const calloutSettings = cloneDeep(DefaultCalloutSettings) as any;
    const settingsData = { framing: { spaces: {} } };

    // Exactly what CalloutService.createCalloutSettings does before calling
    // the normalizer (callout.service.ts createCalloutSettings + line ~154).
    merge(calloutSettings, settingsData);
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

  it('updateCallout-shaped mergeWith on a legacy callout with no stored block: spaces: {} persists { cardVariant: COMPACT }', () => {
    const storedFraming = {
      commentsEnabled: true,
      selection: { mode: CalloutSelectionMode.AUTO, selectedIds: [] },
      // No `spaces` key stored — the pre-existing-row shape (probe 8).
    } as any;
    const updateData = { framing: { spaces: {} } };

    // Exactly what CalloutService.updateCallout does before calling the
    // normalizer (callout.service.ts updateCallout mergeWith + line ~639).
    const mergedFraming = mergeWith(
      storedFraming,
      updateData.framing,
      (_existing: unknown, incoming: unknown) =>
        Array.isArray(incoming) ? incoming : undefined
    );
    expect(mergedFraming.spaces).toEqual({});

    const normalized = realFramingService.validateAndNormalizeSpacesSettings(
      CalloutFramingType.SPACES,
      mergedFraming,
      updateData.framing.spaces
    );

    expect(normalized.spaces).toEqual({
      cardVariant: SpaceCollectionCardVariant.COMPACT,
    });
  });
});
