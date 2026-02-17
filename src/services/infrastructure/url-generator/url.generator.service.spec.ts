import { SpaceLevel } from '@common/enums/space.level';
import { UrlPathBase } from '@common/enums/url.path.base';
import { UrlPathElement } from '@common/enums/url.path.element';
import { UrlPathElementSpace } from '@common/enums/url.path.element.space';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { UrlGeneratorService } from './url.generator.service';
import { UrlGeneratorCacheService } from './url.generator.service.cache';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('UrlGeneratorService', () => {
  let service: UrlGeneratorService;
  let db: any;
  let cacheService: {
    getUrlFromCache: Mock;
    setUrlCache: Mock;
  };

  const ENDPOINT = 'https://app.alkem.io';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlGeneratorService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue(ENDPOINT),
          },
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(UrlGeneratorService);
    db = module.get(DRIZZLE);
    cacheService = module.get(UrlGeneratorCacheService) as any;
  });

  describe('generateUrlForVC', () => {
    it('should generate the correct URL for a virtual contributor by nameID', () => {
      const result = service.generateUrlForVC('my-vc');

      expect(result).toBe(`${ENDPOINT}/vc/my-vc`);
    });
  });

  describe('generateUrlForPlatform', () => {
    it('should return the platform home URL', () => {
      const result = service.generateUrlForPlatform();

      expect(result).toBe(`${ENDPOINT}/home`);
    });
  });

  describe('generateUrlForProfile', () => {
    it('should return cached URL when available', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(
        `${ENDPOINT}/user/cached-user`
      );

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: 'user',
      } as any);

      expect(result).toBe(`${ENDPOINT}/user/cached-user`);
      expect(cacheService.getUrlFromCache).toHaveBeenCalledWith('profile-1');
    });

    it('should cache the generated URL when not already cached and URL is non-empty', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      // ProfileType.USER triggers getNameableEntityInfoForProfileOrFail('user', ...)
      db.execute.mockResolvedValue([
        { entityID: 'user-1', entityNameID: 'john-doe' },
      ]);

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: 'user',
      } as any);

      expect(result).toBe(`${ENDPOINT}/${UrlPathBase.USER}/john-doe`);
      expect(cacheService.setUrlCache).toHaveBeenCalledWith(
        'profile-1',
        `${ENDPOINT}/${UrlPathBase.USER}/john-doe`
      );
    });
  });

  describe('createUrlForContributor', () => {
    it('should create URL with user path when contributor is a User instance', () => {
      const userContributor = {
        id: 'user-1',
        nameID: 'john-doe',
        email: 'john@example.com',
        firstName: 'John',
      } as any;

      const result = service.createUrlForContributor(userContributor);

      expect(result).toBe(`${ENDPOINT}/${UrlPathBase.USER}/john-doe`);
    });

    it('should create URL with organization path when contributor is an Organization instance', () => {
      const orgContributor = {
        id: 'org-1',
        nameID: 'acme-corp',
        legalEntityName: 'Acme Corp',
      } as any;

      const result = service.createUrlForContributor(orgContributor);

      expect(result).toBe(`${ENDPOINT}/${UrlPathBase.ORGANIZATION}/acme-corp`);
    });

    it('should create URL with virtual contributor path when contributor is a VirtualContributor', () => {
      const vcContributor = {
        id: 'vc-1',
        nameID: 'my-vc',
        aiPersonaID: 'persona-1',
      } as any;

      const result = service.createUrlForContributor(vcContributor);

      expect(result).toBe(
        `${ENDPOINT}/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/my-vc`
      );
    });

    it('should throw RelationshipNotFoundException when contributor type is unknown', () => {
      const unknownContributor = { id: 'unknown-1', nameID: 'anon' } as any;

      expect(() => service.createUrlForContributor(unknownContributor)).toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getSpaceUrlPathByID', () => {
    it('should return cached URL when available', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(`${ENDPOINT}/my-space`);

      const result = await service.getSpaceUrlPathByID('space-1');

      expect(result).toBe(`${ENDPOINT}/my-space`);
    });

    it('should throw EntityNotFoundException when spaceID is empty', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);

      await expect(service.getSpaceUrlPathByID('')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when spaceID is null string', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);

      await expect(service.getSpaceUrlPathByID('null')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should generate L0 space URL correctly', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        nameID: 'my-space',
        level: SpaceLevel.L0,
      });

      const result = await service.getSpaceUrlPathByID('space-1');

      expect(result).toBe(`${ENDPOINT}/my-space`);
      expect(cacheService.setUrlCache).toHaveBeenCalledWith(
        'space-1',
        `${ENDPOINT}/my-space`
      );
    });

    it('should generate L1 space URL with parent space name', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'sub-1',
        nameID: 'sub-space',
        level: SpaceLevel.L1,
        parentSpace: {
          id: 'parent-1',
          nameID: 'parent-space',
          level: SpaceLevel.L0,
        },
      });

      const result = await service.getSpaceUrlPathByID('sub-1');

      expect(result).toBe(
        `${ENDPOINT}/parent-space/${UrlPathElement.CHALLENGES}/sub-space`
      );
    });

    it('should generate L2 space URL with grandparent and parent space names', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'subsub-1',
        nameID: 'sub-sub-space',
        level: SpaceLevel.L2,
        parentSpace: {
          id: 'sub-1',
          nameID: 'sub-space',
          level: SpaceLevel.L1,
          parentSpace: {
            id: 'root-1',
            nameID: 'root-space',
            level: SpaceLevel.L0,
          },
        },
      });

      const result = await service.getSpaceUrlPathByID('subsub-1');

      expect(result).toBe(
        `${ENDPOINT}/root-space/${UrlPathElement.CHALLENGES}/sub-space/${UrlPathElement.OPPORTUNITIES}/sub-sub-space`
      );
    });

    it('should append spacePath when provided', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        nameID: 'my-space',
        level: SpaceLevel.L0,
      });

      const result = await service.getSpaceUrlPathByID(
        'space-1',
        UrlPathElementSpace.SETTINGS
      );

      expect(result).toBe(
        `${ENDPOINT}/my-space/${UrlPathElementSpace.SETTINGS}`
      );
    });

    it('should use combined cacheID when spacePath is provided', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        nameID: 'my-space',
        level: SpaceLevel.L0,
      });

      await service.getSpaceUrlPathByID(
        'space-1',
        UrlPathElementSpace.SETTINGS
      );

      expect(cacheService.getUrlFromCache).toHaveBeenCalledWith(
        `space-1-${UrlPathElementSpace.SETTINGS}`
      );
    });
  });

  describe('getNameableEntityInfoForProfileOrFail', () => {
    it('should return entity info when found', async () => {
      db.execute.mockResolvedValue([
        { entityID: 'user-1', entityNameID: 'john-doe' },
      ]);

      const result = await service.getNameableEntityInfoForProfileOrFail(
        'user',
        'profile-1'
      );

      expect(result).toEqual({
        entityID: 'user-1',
        entityNameID: 'john-doe',
      });
    });

    it('should throw EntityNotFoundException when entity not found', async () => {
      db.execute.mockResolvedValue([undefined]);

      await expect(
        service.getNameableEntityInfoForProfileOrFail('user', 'nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('generateUrlForVCById', () => {
    it('should generate VC URL when virtual contributor exists', async () => {
      db.query.virtualContributors.findFirst.mockResolvedValueOnce({
        id: 'vc-1',
        nameID: 'my-vc',
      });

      const result = await service.generateUrlForVCById('vc-1');

      expect(result).toBe(`${ENDPOINT}/vc/my-vc`);
    });

    it('should throw EntityNotFoundException when VC is not found', async () => {
      await expect(service.generateUrlForVCById('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
