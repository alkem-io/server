import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { KonfigService } from '@platform/configuration/config/config.service';
import { MetadataService } from '@platform/metadata/metadata.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { PlatformResolverFields } from './platform.resolver.fields';
import { PlatformService } from './platform.service';

describe('PlatformResolverFields', () => {
  let resolver: PlatformResolverFields;
  let platformService: Mocked<PlatformService>;
  let configService: Mocked<KonfigService>;
  let metadataService: Mocked<MetadataService>;
  let authorizationService: Mocked<AuthorizationService>;
  let platformAuthorizationService: Mocked<PlatformAuthorizationPolicyService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PlatformResolverFields);
    platformService = module.get(PlatformService) as Mocked<PlatformService>;
    configService = module.get(KonfigService) as Mocked<KonfigService>;
    metadataService = module.get(MetadataService) as Mocked<MetadataService>;
    authorizationService = module.get(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as Mocked<PlatformAuthorizationPolicyService>;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('authorization', () => {
    it('should return authorization policy from platform', () => {
      const platform = { id: 'p1' } as any;
      const authPolicy = { id: 'auth-1' } as any;
      platformService.getAuthorizationPolicy.mockReturnValue(authPolicy);

      const result = resolver.authorization(platform);

      expect(result).toBe(authPolicy);
    });
  });

  describe('roleSet', () => {
    it('should return role set', async () => {
      const roleSet = { id: 'rs-1' } as any;
      platformService.getRoleSetOrFail.mockResolvedValue(roleSet);

      const result = await resolver.roleSet();

      expect(result).toBe(roleSet);
    });
  });

  describe('library', () => {
    it('should return library', async () => {
      const library = { id: 'lib-1' } as any;
      platformService.getLibraryOrFail.mockResolvedValue(library);

      const result = await resolver.library();

      expect(result).toBe(library);
    });
  });

  describe('forum', () => {
    it('should return forum', async () => {
      const forum = { id: 'forum-1' } as any;
      platformService.getForumOrFail.mockResolvedValue(forum);

      const result = await resolver.forum();

      expect(result).toBe(forum);
    });
  });

  describe('storageAggregator', () => {
    it('should return storage aggregator for platform', async () => {
      const platform = { id: 'p1' } as any;
      const aggregator = { id: 'sa-1' } as any;
      platformService.getStorageAggregator.mockResolvedValue(aggregator);

      const result = await resolver.storageAggregator(platform);

      expect(result).toBe(aggregator);
    });
  });

  describe('licensingFramework', () => {
    it('should return licensing framework for platform', async () => {
      const platform = { id: 'p1' } as any;
      const framework = { id: 'lf-1' } as any;
      platformService.getLicensingFramework.mockResolvedValue(framework);

      const result = await resolver.licensingFramework(platform);

      expect(result).toBe(framework);
    });
  });

  describe('configuration', () => {
    it('should return config', async () => {
      const config = { template: {} } as any;
      configService.getConfig.mockResolvedValue(config);

      const result = await resolver.configuration();

      expect(result).toBe(config);
    });
  });

  describe('metadata', () => {
    it('should return metadata', async () => {
      const metadata = { services: [] } as any;
      metadataService.getMetadata.mockResolvedValue(metadata);

      const result = await resolver.metadata();

      expect(result).toBe(metadata);
    });
  });

  describe('latestReleaseDiscussion', () => {
    it('should return latest release discussion', async () => {
      const discussion = { id: 'disc-1', nameID: 'release' } as any;
      platformService.getLatestReleaseDiscussion.mockResolvedValue(discussion);

      const result = await resolver.latestReleaseDiscussion();

      expect(result).toBe(discussion);
    });

    it('should return undefined when no release discussion', async () => {
      platformService.getLatestReleaseDiscussion.mockResolvedValue(undefined);

      const result = await resolver.latestReleaseDiscussion();

      expect(result).toBeUndefined();
    });
  });

  describe('templatesManager', () => {
    it('should return templates manager', async () => {
      const tm = { id: 'tm-1' } as any;
      platformService.getTemplatesManagerOrFail.mockResolvedValue(tm);

      const result = await resolver.templatesManager();

      expect(result).toBe(tm);
    });
  });

  describe('wellKnownVirtualContributors', () => {
    it('should return mappings array from platform record', async () => {
      const platform = {
        id: 'p1',
        wellKnownVirtualContributors: {
          mappings: [
            { wellKnown: 'GUIDANCE', virtualContributorID: 'vc-1' },
            { wellKnown: 'IMPACT', virtualContributorID: 'vc-2' },
          ],
        },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;
      authorizationService.grantAccessOrFail.mockResolvedValue(
        undefined as any
      );
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {} as any
      );

      const result = await resolver.wellKnownVirtualContributors(
        platform,
        actorContext
      );

      expect(result.mappings).toHaveLength(2);
      expect(result.mappings[0]).toEqual({
        wellKnown: 'GUIDANCE',
        virtualContributorID: 'vc-1',
      });
    });

    it('should handle empty wellKnownVirtualContributors mappings', async () => {
      const platform = {
        id: 'p1',
        wellKnownVirtualContributors: { mappings: [] },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;
      authorizationService.grantAccessOrFail.mockResolvedValue(
        undefined as any
      );
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {} as any
      );

      const result = await resolver.wellKnownVirtualContributors(
        platform,
        actorContext
      );

      expect(result.mappings).toHaveLength(0);
    });

    it('should handle null wellKnownVirtualContributors', async () => {
      const platform = {
        id: 'p1',
        wellKnownVirtualContributors: null,
      } as any;
      const actorContext = { actorID: 'user-1' } as any;
      authorizationService.grantAccessOrFail.mockResolvedValue(
        undefined as any
      );
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {} as any
      );

      const result = await resolver.wellKnownVirtualContributors(
        platform,
        actorContext
      );

      expect(result.mappings).toHaveLength(0);
    });
  });
});
