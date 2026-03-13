import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { VisualType } from '@common/enums/visual.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { VisualAuthorizationService } from '@domain/common/visual/visual.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { MediaGalleryResolverMutations } from './media.gallery.resolver.mutations';
import { MediaGalleryService } from './media.gallery.service';

describe('MediaGalleryResolverMutations', () => {
  let resolver: MediaGalleryResolverMutations;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let visualAuthorizationService: VisualAuthorizationService;
  let mediaGalleryService: MediaGalleryService;
  let contributionReporterService: ContributionReporterService;
  let communityResolverService: CommunityResolverService;
  let entityManager: EntityManager;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaGalleryResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: EntityManager,
          useValue: {
            findOne: vi.fn(),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(MediaGalleryResolverMutations);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    visualAuthorizationService = module.get(VisualAuthorizationService);
    mediaGalleryService = module.get(MediaGalleryService);
    contributionReporterService = module.get(ContributionReporterService);
    communityResolverService = module.get(CommunityResolverService);
    entityManager = module.get(EntityManager);
  });

  describe('addVisualToMediaGallery', () => {
    const actorContext = {
      agentInfo: { credentials: [] },
    } as unknown as ActorContext;

    it('should check authorization, add visual, apply authorization policy, and save', async () => {
      const mediaGallery = {
        id: 'mg-1',
        authorization: { id: 'auth-1' },
      };
      const visual = {
        id: 'v-1',
        name: VisualType.MEDIA_GALLERY_IMAGE,
        authorization: undefined,
      };
      const appliedAuth = { id: 'auth-v-1' };

      vi.mocked(mediaGalleryService.getMediaGalleryOrFail).mockResolvedValue(
        mediaGallery as any
      );
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(mediaGalleryService.addVisualToMediaGallery).mockResolvedValue(
        visual as any
      );
      vi.mocked(
        visualAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue(appliedAuth as any);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(
        communityResolverService.getLevelZeroSpaceIdForMediaGallery
      ).mockResolvedValue('space-1');
      vi.mocked(entityManager.findOne).mockResolvedValue(null);

      const result = await resolver.addVisualToMediaGallery(actorContext, {
        mediaGalleryID: 'mg-1',
        visualType: VisualType.MEDIA_GALLERY_IMAGE,
        sortOrder: 0,
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mediaGallery.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.stringContaining('add visual to media gallery')
      );
      expect(mediaGalleryService.addVisualToMediaGallery).toHaveBeenCalledWith(
        'mg-1',
        VisualType.MEDIA_GALLERY_IMAGE,
        0
      );
      expect(
        visualAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(visual, mediaGallery.authorization);
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([
        appliedAuth,
      ]);
      expect(result.id).toBe('v-1');
    });

    it('should use callout framing displayName for contribution reporting', async () => {
      const mediaGallery = { id: 'mg-1', authorization: { id: 'auth-1' } };
      const visual = { id: 'v-1', authorization: undefined };
      const appliedAuth = { id: 'auth-v-1' };

      vi.mocked(mediaGalleryService.getMediaGalleryOrFail).mockResolvedValue(
        mediaGallery as any
      );
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(mediaGalleryService.addVisualToMediaGallery).mockResolvedValue(
        visual as any
      );
      vi.mocked(
        visualAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue(appliedAuth as any);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(
        communityResolverService.getLevelZeroSpaceIdForMediaGallery
      ).mockResolvedValue('space-1');
      vi.mocked(entityManager.findOne).mockResolvedValue({
        profile: { displayName: 'My Callout' },
      } as any);

      await resolver.addVisualToMediaGallery(actorContext, {
        mediaGalleryID: 'mg-1',
        visualType: VisualType.MEDIA_GALLERY_IMAGE,
        sortOrder: 0,
      } as any);

      // Wait for the void promise to settle
      await new Promise(r => setTimeout(r, 10));

      expect(
        contributionReporterService.mediaGalleryContribution
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mg-1',
          name: 'Media Gallery of My Callout',
          space: 'space-1',
        }),
        actorContext
      );
    });

    it('should handle contribution reporting errors gracefully', async () => {
      const mediaGallery = { id: 'mg-1', authorization: { id: 'auth-1' } };
      const visual = { id: 'v-1', authorization: undefined };
      const appliedAuth = { id: 'auth-v-1' };

      vi.mocked(mediaGalleryService.getMediaGalleryOrFail).mockResolvedValue(
        mediaGallery as any
      );
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(mediaGalleryService.addVisualToMediaGallery).mockResolvedValue(
        visual as any
      );
      vi.mocked(
        visualAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue(appliedAuth as any);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(
        communityResolverService.getLevelZeroSpaceIdForMediaGallery
      ).mockRejectedValue(new Error('Network error'));

      // Should not throw even if reporting fails
      const result = await resolver.addVisualToMediaGallery(actorContext, {
        mediaGalleryID: 'mg-1',
        visualType: VisualType.MEDIA_GALLERY_IMAGE,
        sortOrder: 0,
      } as any);

      expect(result.id).toBe('v-1');
    });
  });

  describe('deleteVisualFromMediaGallery', () => {
    const actorContext = {
      agentInfo: { credentials: [] },
    } as unknown as ActorContext;

    it('should check authorization and delete the visual', async () => {
      const mediaGallery = {
        id: 'mg-1',
        authorization: { id: 'auth-1' },
      };
      const deletedVisual = { id: 'v-1' };

      vi.mocked(mediaGalleryService.getMediaGalleryOrFail).mockResolvedValue(
        mediaGallery as any
      );
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(
        mediaGalleryService.deleteVisualFromMediaGallery
      ).mockResolvedValue(deletedVisual as any);

      const result = await resolver.deleteVisualFromMediaGallery(actorContext, {
        mediaGalleryID: 'mg-1',
        visualID: 'v-1',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mediaGallery.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.stringContaining('delete visual from media gallery')
      );
      expect(
        mediaGalleryService.deleteVisualFromMediaGallery
      ).toHaveBeenCalledWith('mg-1', 'v-1');
      expect(result).toBe(deletedVisual);
    });
  });
});
