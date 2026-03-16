import { ActorType } from '@common/enums/actor.type';
import { ProfileType } from '@common/enums/profile.type';
import { SpaceLevel } from '@common/enums/space.level';
import { UrlPathBase } from '@common/enums/url.path.base';
import { UrlPathElement } from '@common/enums/url.path.element';
import { UrlPathElementSpace } from '@common/enums/url.path.element.space';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { Organization } from '@domain/community/organization/organization.entity';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { UrlGeneratorService } from './url.generator.service';
import { UrlGeneratorCacheService } from './url.generator.service.cache';

describe('UrlGeneratorService', () => {
  let service: UrlGeneratorService;
  let entityManager: {
    findOne: Mock;
    connection: { query: Mock };
  };
  let cacheService: {
    getUrlFromCache: Mock;
    setUrlCache: Mock;
  };

  const ENDPOINT = 'https://app.alkem.io';

  beforeEach(async () => {
    vi.restoreAllMocks();

    entityManager = {
      findOne: vi.fn(),
      connection: { query: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlGeneratorService,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
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
      entityManager.connection.query.mockResolvedValue([
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
      const userContributor = Object.create(User.prototype);
      userContributor.id = 'user-1';
      userContributor.type = ActorType.USER;
      userContributor.nameID = 'john-doe';

      const result = service.createUrlForContributor(userContributor);

      expect(result).toBe(`${ENDPOINT}/${UrlPathBase.USER}/john-doe`);
    });

    it('should create URL with organization path when contributor is an Organization instance', () => {
      const orgContributor = Object.create(Organization.prototype);
      orgContributor.id = 'org-1';
      orgContributor.type = ActorType.ORGANIZATION;
      orgContributor.nameID = 'acme-corp';

      const result = service.createUrlForContributor(orgContributor);

      expect(result).toBe(`${ENDPOINT}/${UrlPathBase.ORGANIZATION}/acme-corp`);
    });

    it('should create URL with virtual contributor path when contributor is a VirtualContributor', () => {
      const vcContributor = Object.create(VirtualContributor.prototype);
      vcContributor.id = 'vc-1';
      vcContributor.type = ActorType.VIRTUAL_CONTRIBUTOR;
      vcContributor.nameID = 'my-vc';

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
      entityManager.findOne.mockResolvedValue({
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
      entityManager.findOne.mockResolvedValue({
        id: 'sub-1',
        nameID: 'sub-space',
        level: SpaceLevel.L1,
        parentSpace: { nameID: 'parent-space' },
      });

      const result = await service.getSpaceUrlPathByID('sub-1');

      expect(result).toBe(
        `${ENDPOINT}/parent-space/${UrlPathElement.CHALLENGES}/sub-space`
      );
    });

    it('should generate L2 space URL with grandparent and parent space names', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue({
        id: 'subsub-1',
        nameID: 'sub-sub-space',
        level: SpaceLevel.L2,
        parentSpace: {
          nameID: 'sub-space',
          parentSpace: { nameID: 'root-space' },
        },
      });

      const result = await service.getSpaceUrlPathByID('subsub-1');

      expect(result).toBe(
        `${ENDPOINT}/root-space/${UrlPathElement.CHALLENGES}/sub-space/${UrlPathElement.OPPORTUNITIES}/sub-sub-space`
      );
    });

    it('should append spacePath when provided', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue({
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
      entityManager.findOne.mockResolvedValue({
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
      entityManager.connection.query.mockResolvedValue([
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
      entityManager.connection.query.mockResolvedValue([undefined]);

      await expect(
        service.getNameableEntityInfoForProfileOrFail('user', 'nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('generateUrlForVCById', () => {
    it('should generate VC URL when virtual contributor exists', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'vc-1',
        nameID: 'my-vc',
      });

      const result = await service.generateUrlForVCById('vc-1');

      expect(result).toBe(`${ENDPOINT}/vc/my-vc`);
    });

    it('should throw EntityNotFoundException when VC is not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.generateUrlForVCById('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('generateUrlForProfile - ProfileType branches', () => {
    beforeEach(() => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
    });

    it('should generate URL for ACCOUNT profile type', async () => {
      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.ACCOUNT,
      } as any);

      expect(result).toBe(`${ENDPOINT}/admin`);
    });

    it('should generate URL for VIRTUAL_CONTRIBUTOR profile type', async () => {
      entityManager.connection.query.mockResolvedValue([
        { entityID: 'vc-1', entityNameID: 'my-vc' },
      ]);

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.VIRTUAL_CONTRIBUTOR,
      } as any);

      expect(result).toBe(
        `${ENDPOINT}/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/my-vc`
      );
    });

    it('should generate URL for ORGANIZATION profile type', async () => {
      entityManager.connection.query.mockResolvedValue([
        { entityID: 'org-1', entityNameID: 'acme-corp' },
      ]);

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.ORGANIZATION,
      } as any);

      expect(result).toBe(`${ENDPOINT}/${UrlPathBase.ORGANIZATION}/acme-corp`);
    });

    it('should generate URL for USER_GROUP profile type (defaults to endpoint)', async () => {
      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.USER_GROUP,
      } as any);

      expect(result).toBe(`${ENDPOINT}`);
    });

    it('should generate URL for SPACE profile type', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.connection.query.mockResolvedValue([
        { entityID: 'space-1', entityNameID: 'my-space' },
      ]);
      entityManager.findOne.mockResolvedValue({
        id: 'space-1',
        nameID: 'my-space',
        level: SpaceLevel.L0,
      });

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.SPACE,
      } as any);

      expect(result).toBe(`${ENDPOINT}/my-space`);
    });

    it('should generate URL for INNOVATION_HUB profile type', async () => {
      entityManager.connection.query.mockResolvedValue([
        { entityID: 'hub-1', entityNameID: 'my-hub' },
      ]);

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.INNOVATION_HUB,
      } as any);

      expect(result).toBe(`${ENDPOINT}/innovation-hubs/my-hub/settings`);
    });

    it('should generate URL for INNOVATION_PACK profile type', async () => {
      entityManager.connection.query.mockResolvedValue([
        { entityID: 'pack-1', entityNameID: 'my-pack' },
      ]);

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.INNOVATION_PACK,
      } as any);

      expect(result).toBe(
        `${ENDPOINT}/${UrlPathBase.INNOVATION_PACKS}/my-pack`
      );
    });

    it('should generate URL for DISCUSSION profile type', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'disc-1',
        nameID: 'my-discussion',
      });

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.DISCUSSION,
      } as any);

      expect(result).toBe(`${ENDPOINT}/forum/discussion/my-discussion`);
    });

    it('should generate URL for KNOWLEDGE_BASE profile type', async () => {
      entityManager.findOne.mockResolvedValue({
        nameID: 'my-vc',
      });

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.KNOWLEDGE_BASE,
      } as any);

      expect(result).toBe(
        `${ENDPOINT}/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/my-vc/${UrlPathElement.KNOWLEDGE_BASE}`
      );
    });
  });

  describe('getForumDiscussionUrlPath', () => {
    it('should return URL for existing discussion', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'disc-1',
        nameID: 'test-discussion',
      });

      const result = await service.getForumDiscussionUrlPath('disc-1');

      expect(result).toBe(`${ENDPOINT}/forum/discussion/test-discussion`);
    });

    it('should throw EntityNotFoundException when discussion not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getForumDiscussionUrlPath('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('createUrlForOrganizationNameID', () => {
    it('should generate correct organization URL', () => {
      const result = service.createUrlForOrganizationNameID('acme');
      expect(result).toBe(`${ENDPOINT}/${UrlPathBase.ORGANIZATION}/acme`);
    });
  });

  describe('createUrlForUserNameID', () => {
    it('should generate correct user URL', () => {
      const result = service.createUrlForUserNameID('john');
      expect(result).toBe(`${ENDPOINT}/${UrlPathBase.USER}/john`);
    });
  });

  describe('getCalendarEventIcsRestUrl', () => {
    it('should generate the correct ICS REST URL', () => {
      const configService = {
        get: vi.fn().mockReturnValue({ path_api_private_rest: '/api/private' }),
      };
      // Access the configService through the service
      (service as any).configService = configService;

      const result = service.getCalendarEventIcsRestUrl('event-123');

      expect(result).toContain('/calendar/event/event-123/ics');
    });
  });

  describe('createSpaceAdminCommunityURL', () => {
    it('should generate the admin community URL for a space', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue({
        id: 'space-1',
        nameID: 'my-space',
        level: SpaceLevel.L0,
      });

      const result = await service.createSpaceAdminCommunityURL('space-1');

      expect(result).toBe(
        `${ENDPOINT}/my-space/${UrlPathElementSpace.SETTINGS}/${UrlPathElementSpace.COMMUNITY}`
      );
    });
  });

  describe('getNameableEntityInfo', () => {
    it('should use actor table for actor-based entity types', async () => {
      entityManager.connection.query.mockResolvedValue([
        { entityID: 'user-1', entityNameID: 'john' },
      ]);

      const result = await service.getNameableEntityInfo('user', 'profile-1');

      expect(result).toEqual({
        entityID: 'user-1',
        entityNameID: 'john',
      });
      // Verify the query uses the actor table
      const queryArg = entityManager.connection.query.mock.calls[0][0];
      expect(queryArg).toContain('"actor"');
    });

    it('should use entity table for non-actor-based entity types', async () => {
      entityManager.connection.query.mockResolvedValue([
        { entityID: 'pack-1', entityNameID: 'my-pack' },
      ]);

      const result = await service.getNameableEntityInfo(
        'innovation_pack',
        'profile-1'
      );

      expect(result).toEqual({
        entityID: 'pack-1',
        entityNameID: 'my-pack',
      });
      const queryArg = entityManager.connection.query.mock.calls[0][0];
      expect(queryArg).toContain('"innovation_pack"');
    });

    it('should return null when no result found', async () => {
      entityManager.connection.query.mockResolvedValue([undefined]);

      const result = await service.getNameableEntityInfo('user', 'profile-1');

      expect(result).toBeNull();
    });
  });

  describe('L1 space URL with missing parent', () => {
    it('should throw EntityNotFoundException when L1 space has no parent', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue({
        id: 'sub-1',
        nameID: 'sub-space',
        level: SpaceLevel.L1,
        parentSpace: null,
      });

      await expect(service.getSpaceUrlPathByID('sub-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('L2 space URL with missing parents', () => {
    it('should throw EntityNotFoundException when L2 space has no parent chain', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue({
        id: 'subsub-1',
        nameID: 'sub-sub-space',
        level: SpaceLevel.L2,
        parentSpace: null,
      });

      await expect(service.getSpaceUrlPathByID('subsub-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getCalloutUrlPath', () => {
    it('should throw EntityNotFoundException when callout not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getCalloutUrlPath('callout-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw when callout has no calloutsSet and no template found', async () => {
      // findOne Callout: found but no calloutsSet
      entityManager.findOne
        .mockResolvedValueOnce({
          id: 'callout-1',
          nameID: 'my-callout',
          calloutsSet: null,
        })
        // findOne Template: not found
        .mockResolvedValueOnce(null);

      await expect(service.getCalloutUrlPath('callout-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should return URL via VC knowledge base when callout is in a calloutsSet but not in a collaboration', async () => {
      // findOne Callout: in calloutsSet
      entityManager.findOne
        .mockResolvedValueOnce({
          id: 'callout-1',
          nameID: 'my-callout',
          calloutsSet: { id: 'cs-1' },
        })
        // findOne Collaboration: not found
        .mockResolvedValueOnce(null)
        // findOne VirtualContributor: found
        .mockResolvedValueOnce({
          nameID: 'my-vc',
        });

      const result = await service.getCalloutUrlPath('callout-1');

      expect(result).toBe(
        `${ENDPOINT}/vc/my-vc/${UrlPathElement.KNOWLEDGE_BASE}/my-callout`
      );
    });

    it('should throw when callout is in calloutsSet, no collaboration, and no VC', async () => {
      entityManager.findOne
        .mockResolvedValueOnce({
          id: 'callout-1',
          nameID: 'my-callout',
          calloutsSet: { id: 'cs-1' },
        })
        .mockResolvedValueOnce(null) // no collaboration
        .mockResolvedValueOnce(null); // no VC

      await expect(service.getCalloutUrlPath('callout-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should return URL with collaboration path when callout is on a space', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      // findOne Callout with calloutsSet
      entityManager.findOne
        .mockResolvedValueOnce({
          id: 'callout-1',
          nameID: 'my-callout',
          calloutsSet: { id: 'cs-1' },
        })
        // findOne Collaboration
        .mockResolvedValueOnce({ id: 'collab-1' })
        // findOne Space for collaboration
        .mockResolvedValueOnce({ id: 'space-1' })
        // getSpaceUrlPathByCollaborationID -> findOne Space with parents
        .mockResolvedValueOnce({
          id: 'space-1',
          nameID: 'my-space',
          level: SpaceLevel.L0,
        });

      const result = await service.getCalloutUrlPath('callout-1');

      expect(result).toBe(
        `${ENDPOINT}/my-space/${UrlPathElement.COLLABORATION}/my-callout`
      );
    });
  });

  describe('getPostUrlPath', () => {
    it('should return URL for a post', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      // Raw query for post
      entityManager.connection.query.mockResolvedValue([
        { postId: 'post-1', postNameId: 'my-post' },
      ]);
      // findOne CalloutContribution
      entityManager.findOne
        .mockResolvedValueOnce({
          callout: { id: 'callout-1' },
          post: { id: 'post-1' },
        })
        // getCalloutUrlPath -> findOne Callout
        .mockResolvedValueOnce({
          id: 'callout-1',
          nameID: 'my-callout',
          calloutsSet: { id: 'cs-1' },
        })
        // findOne Collaboration
        .mockResolvedValueOnce({ id: 'collab-1' })
        // findOne Space
        .mockResolvedValueOnce({ id: 'space-1' })
        // getSpaceUrlPathByCollaborationID -> findOne Space with parents
        .mockResolvedValueOnce({
          id: 'space-1',
          nameID: 'my-space',
          level: SpaceLevel.L0,
        });

      const result = await service.getPostUrlPath('callout-1');

      expect(result).toContain('/posts/my-post');
    });
  });

  describe('getWhiteboardUrlPath', () => {
    it('should return URL for a whiteboard in a callout framing', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      // findOne Callout (via framing whiteboard)
      entityManager.findOne
        .mockResolvedValueOnce({
          id: 'callout-1',
          nameID: 'my-callout',
        })
        // getCalloutUrlPath -> findOne Callout
        .mockResolvedValueOnce({
          id: 'callout-1',
          nameID: 'my-callout',
          calloutsSet: { id: 'cs-1' },
        })
        // findOne Collaboration
        .mockResolvedValueOnce({ id: 'collab-1' })
        // findOne Space
        .mockResolvedValueOnce({ id: 'space-1' })
        // getSpaceUrlPathByCollaborationID -> findOne Space with parents
        .mockResolvedValueOnce({
          id: 'space-1',
          nameID: 'my-space',
          level: SpaceLevel.L0,
        });

      const result = await service.getWhiteboardUrlPath(
        'wb-1',
        'my-whiteboard'
      );

      expect(result).toContain('my-whiteboard');
    });
  });

  describe('generateUrlForProfile - CALLOUT_FRAMING', () => {
    it('should throw when callout not found for framing profile', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.generateUrlForProfile({
          id: 'profile-1',
          type: ProfileType.CALLOUT_FRAMING,
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('generateUrlForProfile - SPACE_ABOUT', () => {
    it('should generate URL for SPACE_ABOUT profile via space', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      // getSpaceAboutByProfileID -> findOne SpaceAbout
      entityManager.findOne
        .mockResolvedValueOnce({ id: 'about-1' })
        // findOne Space by about.id
        .mockResolvedValueOnce({
          id: 'space-1',
          nameID: 'my-space',
          level: SpaceLevel.L0,
        });

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.SPACE_ABOUT,
      } as any);

      expect(result).toBe(`${ENDPOINT}/my-space`);
    });
  });

  describe('generateUrlForProfile - COMMUNITY_GUIDELINES', () => {
    it('should return null-ish URL when community guidelines not found', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.generateUrlForProfile({
        id: 'profile-1',
        type: ProfileType.COMMUNITY_GUIDELINES,
      } as any);

      expect(result).toBe('');
    });
  });

  describe('generateUrlForProfile - POST', () => {
    it('should throw when post not found by profile ID', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.connection.query.mockResolvedValue([undefined]);

      await expect(
        service.generateUrlForProfile({
          id: 'profile-1',
          type: ProfileType.POST,
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('generateUrlForProfile - WHITEBOARD', () => {
    it('should throw when whiteboard not found by profile ID', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.generateUrlForProfile({
          id: 'profile-1',
          type: ProfileType.WHITEBOARD,
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('generateUrlForProfile - MEMO', () => {
    it('should throw when memo not found by profile ID', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.generateUrlForProfile({
          id: 'profile-1',
          type: ProfileType.MEMO,
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('generateUrlForProfile - INNOVATION_FLOW', () => {
    it('should throw when collaboration not found for innovation flow', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.generateUrlForProfile({
          id: 'profile-1',
          type: ProfileType.INNOVATION_FLOW,
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('generateUrlForProfile - TEMPLATE', () => {
    it('should throw when template not found for profile', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.generateUrlForProfile({
          id: 'profile-1',
          type: ProfileType.TEMPLATE,
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('generateUrlForProfile - CALENDAR_EVENT', () => {
    it('should throw when calendar event not found', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.connection.query.mockResolvedValue([undefined]);

      await expect(
        service.generateUrlForProfile({
          id: 'profile-1',
          type: ProfileType.CALENDAR_EVENT,
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCalendarEventUrlPath', () => {
    it('should return calendar event URL path', async () => {
      cacheService.getUrlFromCache.mockResolvedValue(undefined);
      entityManager.connection.query.mockResolvedValue([
        {
          entityID: 'event-1',
          entityNameID: 'my-event',
          calendarID: 'cal-1',
        },
      ]);
      // findOne Collaboration via timeline.calendar
      entityManager.findOne
        .mockResolvedValueOnce({ id: 'collab-1' })
        // getSpaceUrlPathByCollaborationID -> findOne Space
        .mockResolvedValueOnce({
          id: 'space-1',
          nameID: 'my-space',
          level: SpaceLevel.L0,
        });

      const result = await service.getCalendarEventUrlPath('event-1');

      expect(result).toBe(
        `${ENDPOINT}/my-space/${UrlPathElement.CALENDAR}/my-event`
      );
    });

    it('should throw when calendar event not found', async () => {
      entityManager.connection.query.mockResolvedValue([undefined]);

      await expect(
        service.getCalendarEventUrlPath('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when collaboration for calendar not found', async () => {
      entityManager.connection.query.mockResolvedValue([
        {
          entityID: 'event-1',
          entityNameID: 'my-event',
          calendarID: 'cal-1',
        },
      ]);
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getCalendarEventUrlPath('event-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
