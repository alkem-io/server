import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { EntityNotFoundException } from '@common/exceptions';
import { ILoader } from '@core/dataloader/loader.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { ISpaceAbout } from '@domain/space/space.about/space.about.interface';
import { TemplateContentSpaceLookupService } from '@domain/template/template-content-space/template-content-space.lookup/template-content-space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { SpaceAboutResolverFields } from './space.about.resolver.fields';

function makeSpaceAbout(id: string): ISpaceAbout {
  return { id } as ISpaceAbout;
}

function makeSpace(id: string, privacyMode: SpacePrivacyMode): ISpace {
  return {
    id,
    settings: { privacy: { mode: privacyMode } },
  } as unknown as ISpace;
}

describe('SpaceAboutResolverFields', () => {
  let resolver: SpaceAboutResolverFields;
  let templateContentSpaceLookupService: Mocked<TemplateContentSpaceLookupService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceAboutResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<SpaceAboutResolverFields>(SpaceAboutResolverFields);
    templateContentSpaceLookupService =
      module.get<TemplateContentSpaceLookupService>(
        TemplateContentSpaceLookupService
      ) as Mocked<TemplateContentSpaceLookupService>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('isContentPublic', () => {
    it('should return true when Space has PUBLIC privacy mode', async () => {
      const spaceAbout = makeSpaceAbout('about-1');
      const space = makeSpace('space-1', SpacePrivacyMode.PUBLIC);
      const loader = { load: vi.fn().mockResolvedValue(space) } as unknown as ILoader<ISpace | null>;

      const result = await resolver.isContentPublic(spaceAbout, loader);

      expect(result).toBe(true);
      expect(
        templateContentSpaceLookupService.getTemplateContentSpaceForSpaceAbout
      ).not.toHaveBeenCalled();
    });

    it('should return false when Space has PRIVATE privacy mode', async () => {
      const spaceAbout = makeSpaceAbout('about-1');
      const space = makeSpace('space-1', SpacePrivacyMode.PRIVATE);
      const loader = { load: vi.fn().mockResolvedValue(space) } as unknown as ILoader<ISpace | null>;

      const result = await resolver.isContentPublic(spaceAbout, loader);

      expect(result).toBe(false);
      expect(
        templateContentSpaceLookupService.getTemplateContentSpaceForSpaceAbout
      ).not.toHaveBeenCalled();
    });

    it('should fall back to TemplateContentSpace when loader returns null and return true for PUBLIC', async () => {
      const spaceAbout = makeSpaceAbout('about-tpl');
      const loader = { load: vi.fn().mockResolvedValue(null) } as unknown as ILoader<ISpace | null>;
      const templateSpace = makeSpace('tpl-1', SpacePrivacyMode.PUBLIC);

      templateContentSpaceLookupService.getTemplateContentSpaceForSpaceAbout.mockResolvedValueOnce(
        templateSpace as any
      );

      const result = await resolver.isContentPublic(spaceAbout, loader);

      expect(result).toBe(true);
      expect(
        templateContentSpaceLookupService.getTemplateContentSpaceForSpaceAbout
      ).toHaveBeenCalledWith('about-tpl');
    });

    it('should fall back to TemplateContentSpace when loader returns null and return false for PRIVATE', async () => {
      const spaceAbout = makeSpaceAbout('about-tpl');
      const loader = { load: vi.fn().mockResolvedValue(null) } as unknown as ILoader<ISpace | null>;
      const templateSpace = makeSpace('tpl-1', SpacePrivacyMode.PRIVATE);

      templateContentSpaceLookupService.getTemplateContentSpaceForSpaceAbout.mockResolvedValueOnce(
        templateSpace as any
      );

      const result = await resolver.isContentPublic(spaceAbout, loader);

      expect(result).toBe(false);
    });

    it('should throw EntityNotFoundException when neither Space nor TemplateContentSpace is found', async () => {
      const spaceAbout = makeSpaceAbout('about-missing');
      const loader = { load: vi.fn().mockResolvedValue(null) } as unknown as ILoader<ISpace | null>;

      templateContentSpaceLookupService.getTemplateContentSpaceForSpaceAbout.mockResolvedValue(
        null
      );

      await expect(
        resolver.isContentPublic(spaceAbout, loader)
      ).rejects.toThrow(EntityNotFoundException);

      await expect(
        resolver.isContentPublic(spaceAbout, loader)
      ).rejects.toThrow(
        'Unable to find Space or TemplateContentSpace for the about'
      );
    });
  });
});
