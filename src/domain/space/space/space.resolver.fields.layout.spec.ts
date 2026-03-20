import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { Space } from '@domain/space/space/space.entity';
import { SpaceResolverFields } from '@domain/space/space/space.resolver.fields';
import { SpaceService } from '@domain/space/space/space.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';

/**
 * Contract: layout field resolver on SpaceResolverFields MUST always return a non-null
 * ISpaceSettingsLayout — even for legacy Spaces stored without the layout JSONB key.
 * This prevents null-bubbling the non-null parent field declared in the GraphQL schema.
 *
 * Covers FR-007: "The GraphQL field resolver MUST return EXPANDED as the fallback when
 * the layout or calloutDescriptionDisplayMode field is absent from the stored JSONB."
 */
describe('SpaceResolverFields – layout field resolver (null-safety contract)', () => {
  let resolver: SpaceResolverFields;
  let spaceService: Mocked<SpaceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<SpaceResolverFields>(SpaceResolverFields);
    spaceService = module.get<SpaceService>(
      SpaceService
    ) as Mocked<SpaceService>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('layout()', () => {
    it('returns the existing layout immediately when calloutDescriptionDisplayMode is already populated, without a DB round-trip', async () => {
      // Arrange – space already carries its settings in the parent object
      const space = {
        id: 'space-1',
        settings: {
          layout: {
            calloutDescriptionDisplayMode:
              CalloutDescriptionDisplayMode.COLLAPSED,
          },
        },
      } as unknown as Space;

      // Act
      const result = await resolver.layout(space);

      // Assert
      expect(result.calloutDescriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.COLLAPSED
      );
      expect(spaceService.getSpaceOrFail).not.toHaveBeenCalled();
    });

    it('loads from the DB and returns the stored layout when the parent object has no layout', async () => {
      // Arrange – parent object is a partially-hydrated projection (no settings)
      const space = { id: 'space-2' } as unknown as Space;

      spaceService.getSpaceOrFail.mockResolvedValueOnce({
        id: 'space-2',
        settings: {
          layout: {
            calloutDescriptionDisplayMode:
              CalloutDescriptionDisplayMode.EXPANDED,
          },
        },
      } as any);

      // Act
      const result = await resolver.layout(space);

      // Assert
      expect(result.calloutDescriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.EXPANDED
      );
      expect(spaceService.getSpaceOrFail).toHaveBeenCalledWith('space-2');
    });

    it('synthesizes the EXPANDED default and never returns null when both the parent and loaded space lack the layout key (legacy record)', async () => {
      // Arrange – simulates a legacy DB row: settings column present but no layout key
      const space = {
        id: 'space-legacy',
        settings: { privacy: { mode: 'public' } },
      } as unknown as Space;

      // DB record is equally bare (migration not yet applied or reverted)
      spaceService.getSpaceOrFail.mockResolvedValueOnce({
        id: 'space-legacy',
        settings: { privacy: { mode: 'public' } },
      } as any);

      // Act
      const result = await resolver.layout(space);

      // Assert – must synthesize default, not null-bubble
      expect(result).not.toBeNull();
      expect(result.calloutDescriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.EXPANDED
      );
    });

    it('synthesizes the EXPANDED default when the loaded space has no settings at all (null settings)', async () => {
      // Arrange
      const space = { id: 'space-null-settings' } as unknown as Space;

      spaceService.getSpaceOrFail.mockResolvedValueOnce({
        id: 'space-null-settings',
        settings: null,
      } as any);

      // Act
      const result = await resolver.layout(space);

      // Assert
      expect(result).not.toBeNull();
      expect(result.calloutDescriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.EXPANDED
      );
    });
  });
});
