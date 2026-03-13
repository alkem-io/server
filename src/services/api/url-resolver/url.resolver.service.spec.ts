import { UrlType } from '@common/enums/url.type';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { ForumDiscussionLookupService } from '@platform/forum-discussion-lookup/forum.discussion.lookup.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { UrlResolverResultState } from './dto/url.resolver.result.state';
import { UrlResolverException } from './url.resolver.exception';
import { UrlResolverService } from './url.resolver.service';

describe('UrlResolverService', () => {
  let service: UrlResolverService;
  let authorizationService: { isAccessGranted: Mock; grantAccessOrFail: Mock };
  let userLookupService: { getUserByNameIdOrFail: Mock };
  let organizationLookupService: { getOrganizationByNameIdOrFail: Mock };
  let spaceLookupService: {
    getSpaceByNameIdOrFail: Mock;
    getSubspaceByNameIdInLevelZeroSpace: Mock;
    getSpaceOrFail: Mock;
  };
  let _innovationHubService: { getInnovationHubByNameIdOrFail: Mock };
  let _innovationPackService: { getInnovationPackByNameIdOrFail: Mock };
  let _forumDiscussionLookupService: { getForumDiscussionByNameIdOrFail: Mock };
  let _virtualActorLookupService: {
    getVirtualContributorByNameIdOrFail: Mock;
  };
  let urlGeneratorService: {
    generateUrlForPlatform: Mock;
    getSpaceUrlPathByID: Mock;
    generateUrlForVCById: Mock;
  };
  let entityManager: { findOneOrFail: Mock; findOne: Mock };

  const actorContext = { credentials: [] } as any;

  beforeEach(async () => {
    entityManager = {
      findOneOrFail: vi.fn(),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlResolverService,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(UrlResolverService);
    authorizationService = module.get(AuthorizationService) as any;
    userLookupService = module.get(UserLookupService) as any;
    organizationLookupService = module.get(OrganizationLookupService) as any;
    spaceLookupService = module.get(SpaceLookupService) as any;
    _innovationHubService = module.get(InnovationHubService) as any;
    _innovationPackService = module.get(InnovationPackService) as any;
    _forumDiscussionLookupService = module.get(
      ForumDiscussionLookupService
    ) as any;
    _virtualActorLookupService = module.get(VirtualActorLookupService) as any;
    urlGeneratorService = module.get(UrlGeneratorService) as any;
  });

  describe('resolveUrl', () => {
    it('should return HOME type when URL path is empty', async () => {
      const result = await service.resolveUrl(
        'https://example.com/',
        actorContext
      );

      expect(result.type).toBe(UrlType.HOME);
      expect(result.state).toBe(UrlResolverResultState.Resolved);
    });

    it('should return HOME type for /home base route', async () => {
      const result = await service.resolveUrl(
        'https://example.com/home',
        actorContext
      );

      expect(result.type).toBe(UrlType.HOME);
    });

    it('should return FLOW type for /create-space route', async () => {
      const result = await service.resolveUrl(
        'https://example.com/create-space',
        actorContext
      );

      expect(result.type).toBe(UrlType.FLOW);
    });

    it('should return DOCUMENTATION type for /docs route', async () => {
      const result = await service.resolveUrl(
        'https://example.com/docs',
        actorContext
      );

      expect(result.type).toBe(UrlType.DOCUMENTATION);
    });

    it('should resolve user URL with user ID', async () => {
      const user = { id: 'user-uuid-1' };
      userLookupService.getUserByNameIdOrFail.mockResolvedValue(user);

      const result = await service.resolveUrl(
        'https://example.com/user/john-doe',
        actorContext
      );

      expect(result.type).toBe(UrlType.USER);
      expect(result.userId).toBe('user-uuid-1');
      expect(userLookupService.getUserByNameIdOrFail).toHaveBeenCalledWith(
        'john-doe'
      );
    });

    it('should return NotFound state when user lookup fails with EntityNotFoundException', async () => {
      userLookupService.getUserByNameIdOrFail.mockRejectedValue(
        new EntityNotFoundException('User not found', 'AUTH' as any)
      );
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );

      const result = await service.resolveUrl(
        'https://example.com/user/unknown',
        actorContext
      );

      expect(result.state).toBe(UrlResolverResultState.NotFound);
    });

    it('should return Forbidden state when authorization fails', async () => {
      spaceLookupService.getSpaceByNameIdOrFail.mockRejectedValue(
        new ForbiddenException('Access denied', 'AUTH' as any)
      );
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );

      const result = await service.resolveUrl(
        'https://example.com/my-space',
        actorContext
      );

      expect(result.state).toBe(UrlResolverResultState.Forbidden);
    });

    it('should throw UrlResolverException for unexpected errors', async () => {
      spaceLookupService.getSpaceByNameIdOrFail.mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(
        service.resolveUrl('https://example.com/my-space', actorContext)
      ).rejects.toThrow(UrlResolverException);
    });

    it('should resolve organization URL', async () => {
      const org = { id: 'org-uuid-1' };
      organizationLookupService.getOrganizationByNameIdOrFail.mockResolvedValue(
        org
      );

      const result = await service.resolveUrl(
        'https://example.com/organization/acme',
        actorContext
      );

      expect(result.type).toBe(UrlType.ORGANIZATION);
      expect(result.organizationId).toBe('org-uuid-1');
    });

    it('should resolve space URL with collaboration and authorization', async () => {
      const space = {
        id: 'space-uuid-1',
        level: 0,
        levelZeroSpaceID: 'space-uuid-1',
        authorization: { id: 'auth-1' },
        collaboration: {
          id: 'collab-1',
          calloutsSet: { id: 'cs-1' },
        },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(space);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await service.resolveUrl(
        'https://example.com/my-space',
        actorContext
      );

      expect(result.type).toBe(UrlType.SPACE);
      expect(result.state).toBe(UrlResolverResultState.Resolved);
      expect(result.space).toBeDefined();
      expect(result.space?.id).toBe('space-uuid-1');
    });

    it('should resolve SPACE_EXPLORER type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/spaces',
        actorContext
      );

      expect(result.type).toBe(UrlType.SPACE_EXPLORER);
    });

    it('should resolve CONTRIBUTORS_EXPLORER type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/contributors',
        actorContext
      );

      expect(result.type).toBe(UrlType.CONTRIBUTORS_EXPLORER);
    });

    it('should resolve FORUM type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/forum',
        actorContext
      );

      expect(result.type).toBe(UrlType.FORUM);
    });

    it('should resolve INNOVATION_LIBRARY type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/innovation-library',
        actorContext
      );

      expect(result.type).toBe(UrlType.INNOVATION_LIBRARY);
    });

    it('should resolve identity routes (login, logout, registration)', async () => {
      const loginResult = await service.resolveUrl(
        'https://example.com/login',
        actorContext
      );
      expect(loginResult.type).toBe(UrlType.LOGIN);

      const logoutResult = await service.resolveUrl(
        'https://example.com/logout',
        actorContext
      );
      expect(logoutResult.type).toBe(UrlType.LOGOUT);

      const registrationResult = await service.resolveUrl(
        'https://example.com/registration',
        actorContext
      );
      expect(registrationResult.type).toBe(UrlType.REGISTRATION);
    });

    it('should set closest ancestor to HOME when NotFound and no space/vc', async () => {
      userLookupService.getUserByNameIdOrFail.mockRejectedValue(
        new EntityNotFoundException('Not found', 'AUTH' as any)
      );
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );

      const result = await service.resolveUrl(
        'https://example.com/user/unknown',
        actorContext
      );

      expect(result.state).toBe(UrlResolverResultState.NotFound);
      expect(result.closestAncestor).toBeDefined();
      expect(result.closestAncestor?.type).toBe(UrlType.HOME);
    });

    it('should resolve SIGN_UP type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/sign_up',
        actorContext
      );
      expect(result.type).toBe(UrlType.SIGN_UP);
    });

    it('should resolve VERIFY type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/verify',
        actorContext
      );
      expect(result.type).toBe(UrlType.VERIFY);
    });

    it('should resolve RECOVERY type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/recovery',
        actorContext
      );
      expect(result.type).toBe(UrlType.RECOVERY);
    });

    it('should resolve REQUIRED type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/required',
        actorContext
      );
      expect(result.type).toBe(UrlType.REQUIRED);
    });

    it('should resolve RESTRICTED type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/restricted',
        actorContext
      );
      expect(result.type).toBe(UrlType.RESTRICTED);
    });

    it('should resolve ERROR type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/error',
        actorContext
      );
      expect(result.type).toBe(UrlType.ERROR);
    });

    it('should resolve DOCUMENTATION type for /documentation', async () => {
      const result = await service.resolveUrl(
        'https://example.com/documentation',
        actorContext
      );
      expect(result.type).toBe(UrlType.DOCUMENTATION);
    });

    it('should resolve ADMIN type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/admin',
        actorContext
      );
      expect(result.type).toBe(UrlType.ADMIN);
    });

    it('should resolve INNOVATION_HUB type for /innovation-hubs', async () => {
      const result = await service.resolveUrl(
        'https://example.com/innovation-hubs',
        actorContext
      );
      expect(result.type).toBe(UrlType.INNOVATION_HUB);
    });

    it('should resolve innovation hub with nameID', async () => {
      _innovationHubService.getInnovationHubByNameIdOrFail.mockResolvedValue({
        id: 'hub-123',
      });

      const result = await service.resolveUrl(
        'https://example.com/innovation-hubs/my-hub',
        actorContext
      );
      expect(result.type).toBe(UrlType.INNOVATION_HUB);
      expect(result.innovationHubId).toBe('hub-123');
    });

    it('should resolve /hub route with nameID', async () => {
      _innovationHubService.getInnovationHubByNameIdOrFail.mockResolvedValue({
        id: 'hub-456',
      });

      const result = await service.resolveUrl(
        'https://example.com/hub/my-hub',
        actorContext
      );
      expect(result.type).toBe(UrlType.INNOVATION_HUB);
      expect(result.innovationHubId).toBe('hub-456');
    });

    it('should resolve innovation pack with nameID', async () => {
      _innovationPackService.getInnovationPackByNameIdOrFail.mockResolvedValue({
        id: 'pack-123',
        templatesSet: {
          id: 'ts-1',
          templates: [],
        },
      });

      const result = await service.resolveUrl(
        'https://example.com/innovation-packs/my-pack',
        actorContext
      );
      expect(result.type).toBe(UrlType.INNOVATION_PACKS);
      expect(result.innovationPack?.id).toBe('pack-123');
      expect(result.innovationPack?.templatesSet.id).toBe('ts-1');
    });

    it('should resolve innovation pack with template nameID', async () => {
      _innovationPackService.getInnovationPackByNameIdOrFail.mockResolvedValue({
        id: 'pack-123',
        templatesSet: {
          id: 'ts-1',
          templates: [{ id: 'tmpl-1', nameID: 'my-template' }],
        },
      });

      const result = await service.resolveUrl(
        'https://example.com/innovation-packs/my-pack/my-template',
        actorContext
      );
      expect(result.innovationPack?.templatesSet.templateId).toBe('tmpl-1');
    });

    it('should handle innovation pack with missing templatesSet', async () => {
      _innovationPackService.getInnovationPackByNameIdOrFail.mockResolvedValue({
        id: 'pack-123',
        templatesSet: undefined,
      });
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );

      const result = await service.resolveUrl(
        'https://example.com/innovation-packs/my-pack',
        actorContext
      );
      expect(result.state).toBe(UrlResolverResultState.NotFound);
    });

    it('should resolve forum discussion URL', async () => {
      _forumDiscussionLookupService.getForumDiscussionByNameIdOrFail.mockResolvedValue(
        { id: 'disc-123' }
      );

      const result = await service.resolveUrl(
        'https://example.com/forum/discussion/my-discussion',
        actorContext
      );
      expect(result.type).toBe(UrlType.DISCUSSION);
      expect(result.discussionId).toBe('disc-123');
    });

    it('should handle ValidationException on /user without nameID as NotFound', async () => {
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );

      const result = await service.resolveUrl(
        'https://example.com/user',
        actorContext
      );
      expect(result.state).toBe(UrlResolverResultState.NotFound);
    });

    it('should handle ValidationException on /organization without nameID as NotFound', async () => {
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );

      const result = await service.resolveUrl(
        'https://example.com/organization',
        actorContext
      );
      expect(result.state).toBe(UrlResolverResultState.NotFound);
    });

    it('should resolve VC URL and populate virtual contributor result', async () => {
      const mockVC = {
        id: 'vc-123',
        knowledgeBase: {
          calloutsSet: {
            id: 'cs-vc-1',
            callouts: [],
          },
        },
      };
      _virtualActorLookupService.getVirtualContributorByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockVC);

      const result = await service.resolveUrl(
        'https://example.com/vc/my-vc',
        actorContext
      );
      expect(result.type).toBe(UrlType.VIRTUAL_CONTRIBUTOR);
      expect(result.virtualContributor?.id).toBe('vc-123');
    });

    it('should handle VC URL without nameID as NotFound', async () => {
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );

      const result = await service.resolveUrl(
        'https://example.com/vc',
        actorContext
      );
      expect(result.state).toBe(UrlResolverResultState.NotFound);
    });

    it('should handle VC with missing knowledgeBase as NotFound', async () => {
      const mockVC = {
        id: 'vc-123',
        knowledgeBase: undefined,
      };
      _virtualActorLookupService.getVirtualContributorByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockVC);
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );
      urlGeneratorService.generateUrlForVCById.mockResolvedValue(
        'https://example.com/vc/my-vc'
      );

      const result = await service.resolveUrl(
        'https://example.com/vc/my-vc',
        actorContext
      );
      expect(result.state).toBe(UrlResolverResultState.NotFound);
    });

    it('should resolve VC URL with callout', async () => {
      const mockVC = {
        id: 'vc-123',
        knowledgeBase: {
          calloutsSet: {
            id: 'cs-vc-1',
            callouts: [
              {
                id: 'callout-1',
                nameID: 'my-callout',
                authorization: { id: 'auth-co' },
                contributions: [],
              },
            ],
          },
        },
      };
      _virtualActorLookupService.getVirtualContributorByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockVC);
      entityManager.findOneOrFail.mockResolvedValue({
        id: 'callout-1',
        nameID: 'my-callout',
        authorization: { id: 'auth-co' },
        contributions: [],
      });
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await service.resolveUrl(
        'https://example.com/vc/my-vc/knowledge-base/my-callout',
        actorContext
      );
      expect(result.type).toBe(UrlType.VIRTUAL_CONTRIBUTOR);
      expect(result.virtualContributor?.calloutsSet?.calloutId).toBe(
        'callout-1'
      );
    });

    it('should resolve space with subspace', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      const spaceL1 = {
        id: 'space-l1',
        level: 1,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-2' },
        collaboration: { id: 'collab-2', calloutsSet: { id: 'cs-2' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      spaceLookupService.getSubspaceByNameIdInLevelZeroSpace.mockResolvedValue(
        spaceL1
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await service.resolveUrl(
        'https://example.com/my-space/challenges/my-challenge',
        actorContext
      );
      expect(result.type).toBe(UrlType.SPACE);
      expect(result.space?.id).toBe('space-l1');
      expect(result.space?.parentSpaces).toEqual(['space-l0']);
    });

    it('should resolve space with subspace and sub-subspace', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      const spaceL1 = {
        id: 'space-l1',
        level: 1,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-2' },
        collaboration: { id: 'collab-2', calloutsSet: { id: 'cs-2' } },
      };
      const spaceL2 = {
        id: 'space-l2',
        level: 2,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-3' },
        collaboration: { id: 'collab-3', calloutsSet: { id: 'cs-3' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      spaceLookupService.getSubspaceByNameIdInLevelZeroSpace
        .mockResolvedValueOnce(spaceL1)
        .mockResolvedValueOnce(spaceL2);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await service.resolveUrl(
        'https://example.com/my-space/challenges/my-challenge/opportunities/my-opportunity',
        actorContext
      );
      expect(result.type).toBe(UrlType.SPACE);
      expect(result.space?.id).toBe('space-l2');
      expect(result.space?.parentSpaces).toEqual(['space-l0', 'space-l1']);
    });

    it('should resolve space internal collaboration path with callout', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      entityManager.findOneOrFail.mockResolvedValue({
        id: 'callout-1',
        nameID: 'my-callout',
        authorization: { id: 'auth-co' },
        contributions: [],
      });

      const result = await service.resolveUrl(
        'https://example.com/my-space/collaboration/my-callout',
        actorContext
      );
      expect(result.type).toBe(UrlType.SPACE);
      expect(result.space?.collaboration.calloutsSet?.calloutId).toBe(
        'callout-1'
      );
    });

    it('should resolve space internal collaboration with post contribution', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      entityManager.findOneOrFail.mockResolvedValue({
        id: 'callout-1',
        nameID: 'my-callout',
        authorization: { id: 'auth-co' },
        contributions: [],
      });
      entityManager.findOne.mockResolvedValue({
        id: 'contrib-1',
        authorization: { id: 'auth-contrib' },
        post: { id: 'post-1' },
      });

      const result = await service.resolveUrl(
        'https://example.com/my-space/collaboration/my-callout/posts/my-post',
        actorContext
      );
      expect(result.space?.collaboration.calloutsSet?.postId).toBe('post-1');
      expect(result.space?.collaboration.calloutsSet?.contributionId).toBe(
        'contrib-1'
      );
    });

    it('should resolve space internal collaboration with whiteboard contribution', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      entityManager.findOneOrFail.mockResolvedValue({
        id: 'callout-1',
        nameID: 'my-callout',
        authorization: { id: 'auth-co' },
        contributions: [],
      });
      entityManager.findOne.mockResolvedValue({
        id: 'contrib-2',
        authorization: { id: 'auth-contrib' },
        whiteboard: { id: 'wb-1' },
      });

      const result = await service.resolveUrl(
        'https://example.com/my-space/collaboration/my-callout/whiteboards/my-wb',
        actorContext
      );
      expect(result.space?.collaboration.calloutsSet?.whiteboardId).toBe(
        'wb-1'
      );
    });

    it('should resolve space internal collaboration with memo contribution', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      entityManager.findOneOrFail.mockResolvedValue({
        id: 'callout-1',
        nameID: 'my-callout',
        authorization: { id: 'auth-co' },
        contributions: [],
      });
      entityManager.findOne.mockResolvedValue({
        id: 'contrib-3',
        authorization: { id: 'auth-contrib' },
        memo: { id: 'memo-1' },
      });

      const result = await service.resolveUrl(
        'https://example.com/my-space/collaboration/my-callout/memos/my-memo',
        actorContext
      );
      expect(result.space?.collaboration.calloutsSet?.memoId).toBe('memo-1');
    });

    it('should return callout result when post contribution is not found', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      entityManager.findOneOrFail.mockResolvedValue({
        id: 'callout-1',
        nameID: 'my-callout',
        authorization: { id: 'auth-co' },
        contributions: [],
      });
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.resolveUrl(
        'https://example.com/my-space/collaboration/my-callout/posts/nonexistent',
        actorContext
      );
      expect(result.space?.collaboration.calloutsSet?.calloutId).toBe(
        'callout-1'
      );
      expect(result.space?.collaboration.calloutsSet?.postId).toBeUndefined();
    });

    it('should resolve space internal calendar path', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail
        .mockResolvedValueOnce(spaceL0)
        .mockResolvedValueOnce({
          id: 'space-l0',
          collaboration: {
            timeline: {
              calendar: {
                id: 'cal-1',
                events: [{ id: 'evt-1', nameID: 'my-event' }],
              },
            },
          },
        });
      spaceLookupService.getSpaceOrFail = vi.fn().mockResolvedValue({
        id: 'space-l0',
        collaboration: {
          timeline: {
            calendar: {
              id: 'cal-1',
              events: [{ id: 'evt-1', nameID: 'my-event' }],
            },
          },
        },
      });
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await service.resolveUrl(
        'https://example.com/my-space/calendar/my-event',
        actorContext
      );
      expect(result.space?.calendar?.id).toBe('cal-1');
      expect(result.space?.calendar?.calendarEventId).toBe('evt-1');
    });

    it('should resolve space internal settings/templates path', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      spaceLookupService.getSpaceOrFail = vi.fn().mockResolvedValue({
        id: 'space-l0',
        templatesManager: {
          templatesSet: {
            id: 'ts-1',
            templates: [{ id: 'tmpl-1', nameID: 'my-template' }],
          },
        },
      });
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await service.resolveUrl(
        'https://example.com/my-space/settings/templates/my-template',
        actorContext
      );
      expect(result.space?.templatesSet?.id).toBe('ts-1');
      expect(result.space?.templatesSet?.templateId).toBe('tmpl-1');
    });

    it('should set closest ancestor to space URL when space is found but subsequent lookup fails', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      spaceLookupService.getSubspaceByNameIdInLevelZeroSpace.mockRejectedValue(
        new EntityNotFoundException('Subspace not found', 'test' as any)
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );
      urlGeneratorService.getSpaceUrlPathByID.mockResolvedValue('/my-space');

      const result = await service.resolveUrl(
        'https://example.com/my-space/challenges/nonexistent',
        actorContext
      );
      expect(result.state).toBe(UrlResolverResultState.NotFound);
      expect(result.closestAncestor?.type).toBe(UrlType.SPACE);
      expect(result.closestAncestor?.url).toBe('/my-space');
    });

    it('should handle error in getSpaceUrlPathByID during closest ancestor population', async () => {
      const spaceL0 = {
        id: 'space-l0',
        level: 0,
        levelZeroSpaceID: 'space-l0',
        authorization: { id: 'auth-1' },
        collaboration: { id: 'collab-1', calloutsSet: { id: 'cs-1' } },
      };
      spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(spaceL0);
      spaceLookupService.getSubspaceByNameIdInLevelZeroSpace.mockRejectedValue(
        new EntityNotFoundException('Not found', 'test' as any)
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      urlGeneratorService.generateUrlForPlatform.mockReturnValue(
        'https://example.com'
      );
      urlGeneratorService.getSpaceUrlPathByID.mockRejectedValue(
        new Error('URL generation failed')
      );

      const result = await service.resolveUrl(
        'https://example.com/my-space/challenges/nonexistent',
        actorContext
      );
      // Should fall back to HOME since URL generation for space failed
      expect(result.state).toBe(UrlResolverResultState.NotFound);
      expect(result.closestAncestor?.type).toBe(UrlType.HOME);
    });
  });
});
