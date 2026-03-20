import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { EntityNotFoundException } from '@common/exceptions';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileResolverFields } from '@domain/common/profile/profile.resolver.fields';
import { ProfileService } from '@domain/common/profile/profile.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator';
import { type Mocked, vi } from 'vitest';

const createResolver = () => {
  const profileService = {
    getProfileOrFail: vi.fn(),
  } as unknown as Mocked<ProfileService>;

  const urlGeneratorService = {
    generateUrlForProfile: vi.fn(),
  } as unknown as Mocked<UrlGeneratorService>;

  const resolver = new ProfileResolverFields(
    profileService,
    urlGeneratorService
  );

  return {
    resolver,
    profileService,
    urlGeneratorService,
  };
};

const makeLoader = (data: any) => ({
  load: vi.fn().mockResolvedValue(data),
});

describe('ProfileResolverFields', () => {
  const profile = { id: 'profile-1' } as IProfile;

  describe('visual', () => {
    it('returns the visual matching the requested type', async () => {
      const { resolver } = createResolver();
      const visuals = [
        { name: 'avatar', uri: 'avatar.png' },
        { name: 'banner', uri: 'banner.png' },
      ];
      const loader = makeLoader(visuals);

      const result = await resolver.visual(
        profile,
        'avatar' as any,
        loader as any
      );

      expect(loader.load).toHaveBeenCalledWith('profile-1');
      expect(result).toEqual({ name: 'avatar', uri: 'avatar.png' });
    });

    it('returns undefined when no visual matches', async () => {
      const { resolver } = createResolver();
      const loader = makeLoader([{ name: 'avatar', uri: 'avatar.png' }]);

      const result = await resolver.visual(
        profile,
        'banner' as any,
        loader as any
      );

      expect(result).toBeUndefined();
    });
  });

  describe('visuals', () => {
    it('returns all visuals from loader', async () => {
      const { resolver } = createResolver();
      const visuals = [{ name: 'avatar' }, { name: 'banner' }];
      const loader = makeLoader(visuals);

      const result = await resolver.visuals(profile, loader as any);

      expect(result).toBe(visuals);
    });
  });

  describe('references', () => {
    it('returns references from loader', async () => {
      const { resolver } = createResolver();
      const refs = [{ id: 'ref-1' }];
      const loader = makeLoader(refs);

      const result = await resolver.references(profile, loader as any);

      expect(result).toBe(refs);
    });
  });

  describe('tagset', () => {
    it('returns default tagset when no tagsetName provided', async () => {
      const { resolver } = createResolver();
      const defaultTagset = {
        name: TagsetReservedName.DEFAULT,
        type: TagsetType.FREEFORM,
      };
      const tagsets = [
        defaultTagset,
        { name: 'skills', type: TagsetType.FREEFORM },
      ];
      const loader = makeLoader(tagsets);

      const result = await resolver.tagset(
        profile,
        undefined as any,
        loader as any
      );

      expect(result).toBe(defaultTagset);
    });

    it('throws EntityNotFoundException when default tagset not found', async () => {
      const { resolver } = createResolver();
      const tagsets = [{ name: 'skills', type: TagsetType.FREEFORM }];
      const loader = makeLoader(tagsets);

      await expect(
        resolver.tagset(profile, undefined as any, loader as any)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('returns named tagset when tagsetName is provided', async () => {
      const { resolver } = createResolver();
      const skillsTagset = {
        name: TagsetReservedName.SKILLS,
        type: TagsetType.FREEFORM,
      };
      const tagsets = [
        {
          name: TagsetReservedName.DEFAULT,
          type: TagsetType.FREEFORM,
        },
        skillsTagset,
      ];
      const loader = makeLoader(tagsets);

      const result = await resolver.tagset(
        profile,
        TagsetReservedName.SKILLS,
        loader as any
      );

      expect(result).toBe(skillsTagset);
    });

    it('throws EntityNotFoundException when named tagset not found', async () => {
      const { resolver } = createResolver();
      const tagsets = [
        {
          name: TagsetReservedName.DEFAULT,
          type: TagsetType.FREEFORM,
        },
      ];
      const loader = makeLoader(tagsets);

      await expect(
        resolver.tagset(profile, TagsetReservedName.SKILLS, loader as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('tagsets', () => {
    it('returns all tagsets from loader', async () => {
      const { resolver } = createResolver();
      const tagsets = [{ name: 'default' }, { name: 'skills' }];
      const loader = makeLoader(tagsets);

      const result = await resolver.tagsets(profile, loader as any);

      expect(result).toBe(tagsets);
    });
  });

  describe('location', () => {
    it('returns location from loader', async () => {
      const { resolver } = createResolver();
      const location = { city: 'Amsterdam' };
      const loader = makeLoader(location);

      const result = await resolver.location(profile, loader as any);

      expect(result).toBe(location);
    });
  });

  describe('storageBucket', () => {
    it('returns storage bucket from loader', async () => {
      const { resolver } = createResolver();
      const bucket = { id: 'sb-1' };
      const loader = makeLoader(bucket);

      const result = await resolver.storageBucket(profile, loader as any);

      expect(result).toBe(bucket);
    });
  });

  describe('url', () => {
    it('delegates to urlGeneratorService', async () => {
      const { resolver, urlGeneratorService } = createResolver();
      urlGeneratorService.generateUrlForProfile.mockResolvedValueOnce(
        'https://example.com/profile/1'
      );

      const result = await resolver.url(profile);

      expect(urlGeneratorService.generateUrlForProfile).toHaveBeenCalledWith(
        profile
      );
      expect(result).toBe('https://example.com/profile/1');
    });
  });
});
