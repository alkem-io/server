import { UrlType } from '@common/enums/url.type';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
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
  let _virtualContributorLookupService: {
    getVirtualContributorByNameIdOrFail: Mock;
  };
  let urlGeneratorService: {
    generateUrlForPlatform: Mock;
    getSpaceUrlPathByID: Mock;
    generateUrlForVCById: Mock;
  };
  let entityManager: { findOneOrFail: Mock; findOne: Mock };

  const agentInfo = { credentials: [] } as any;

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
    _virtualContributorLookupService = module.get(
      VirtualContributorLookupService
    ) as any;
    urlGeneratorService = module.get(UrlGeneratorService) as any;
  });

  describe('resolveUrl', () => {
    it('should return HOME type when URL path is empty', async () => {
      const result = await service.resolveUrl(
        'https://example.com/',
        agentInfo
      );

      expect(result.type).toBe(UrlType.HOME);
      expect(result.state).toBe(UrlResolverResultState.Resolved);
    });

    it('should return HOME type for /home base route', async () => {
      const result = await service.resolveUrl(
        'https://example.com/home',
        agentInfo
      );

      expect(result.type).toBe(UrlType.HOME);
    });

    it('should return FLOW type for /create-space route', async () => {
      const result = await service.resolveUrl(
        'https://example.com/create-space',
        agentInfo
      );

      expect(result.type).toBe(UrlType.FLOW);
    });

    it('should return DOCUMENTATION type for /docs route', async () => {
      const result = await service.resolveUrl(
        'https://example.com/docs',
        agentInfo
      );

      expect(result.type).toBe(UrlType.DOCUMENTATION);
    });

    it('should resolve user URL with user ID', async () => {
      const user = { id: 'user-uuid-1' };
      userLookupService.getUserByNameIdOrFail.mockResolvedValue(user);

      const result = await service.resolveUrl(
        'https://example.com/user/john-doe',
        agentInfo
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
        agentInfo
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
        agentInfo
      );

      expect(result.state).toBe(UrlResolverResultState.Forbidden);
    });

    it('should throw UrlResolverException for unexpected errors', async () => {
      spaceLookupService.getSpaceByNameIdOrFail.mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(
        service.resolveUrl('https://example.com/my-space', agentInfo)
      ).rejects.toThrow(UrlResolverException);
    });

    it('should resolve organization URL', async () => {
      const org = { id: 'org-uuid-1' };
      organizationLookupService.getOrganizationByNameIdOrFail.mockResolvedValue(
        org
      );

      const result = await service.resolveUrl(
        'https://example.com/organization/acme',
        agentInfo
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
        agentInfo
      );

      expect(result.type).toBe(UrlType.SPACE);
      expect(result.state).toBe(UrlResolverResultState.Resolved);
      expect(result.space).toBeDefined();
      expect(result.space?.id).toBe('space-uuid-1');
    });

    it('should resolve SPACE_EXPLORER type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/spaces',
        agentInfo
      );

      expect(result.type).toBe(UrlType.SPACE_EXPLORER);
    });

    it('should resolve CONTRIBUTORS_EXPLORER type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/contributors',
        agentInfo
      );

      expect(result.type).toBe(UrlType.CONTRIBUTORS_EXPLORER);
    });

    it('should resolve FORUM type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/forum',
        agentInfo
      );

      expect(result.type).toBe(UrlType.FORUM);
    });

    it('should resolve INNOVATION_LIBRARY type', async () => {
      const result = await service.resolveUrl(
        'https://example.com/innovation-library',
        agentInfo
      );

      expect(result.type).toBe(UrlType.INNOVATION_LIBRARY);
    });

    it('should resolve identity routes (login, logout, registration)', async () => {
      const loginResult = await service.resolveUrl(
        'https://example.com/login',
        agentInfo
      );
      expect(loginResult.type).toBe(UrlType.LOGIN);

      const logoutResult = await service.resolveUrl(
        'https://example.com/logout',
        agentInfo
      );
      expect(logoutResult.type).toBe(UrlType.LOGOUT);

      const registrationResult = await service.resolveUrl(
        'https://example.com/registration',
        agentInfo
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
        agentInfo
      );

      expect(result.state).toBe(UrlResolverResultState.NotFound);
      expect(result.closestAncestor).toBeDefined();
      expect(result.closestAncestor?.type).toBe(UrlType.HOME);
    });
  });
});
