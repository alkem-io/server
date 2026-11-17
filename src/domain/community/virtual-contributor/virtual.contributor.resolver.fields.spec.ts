import { AuthorizationPrivilege } from '@common/enums';
import { VirtualContributorStatus } from '@common/enums/virtual.contributor.status.enum';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyLoaderCreator } from '@core/dataloader/creators';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { VirtualContributorResolverFields } from './virtual.contributor.resolver.fields';
import { VirtualContributorService } from './virtual.contributor.service';

describe('VirtualContributorResolverFields', () => {
  let resolver: VirtualContributorResolverFields;
  let virtualContributorService: {
    getKnowledgeBaseOrFail: Mock;
    getProvider: Mock;
    getBodyOfKnowledgeLastUpdated: Mock;
  };
  let authorizationService: {
    grantAccessOrFail: Mock;
  };
  let aiServerAdapter: {
    getPersonaEngine: Mock;
    getPersonaOrFail: Mock;
  };
  let platformWellKnownVCService: {
    getMappings: Mock;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(VirtualContributorResolverFields);
    virtualContributorService = module.get(VirtualContributorService) as any;
    authorizationService = module.get(AuthorizationService) as any;
    aiServerAdapter = module.get(AiServerAdapter) as any;
    platformWellKnownVCService = module.get(
      PlatformWellKnownVirtualContributorsService
    ) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('wellKnownVirtualContributor', () => {
    it('should return well-known type when VC is mapped', async () => {
      const vc = { id: 'vc-1' } as any;
      platformWellKnownVCService.getMappings.mockResolvedValue({
        [VirtualContributorWellKnown.CHAT_GUIDANCE]: 'vc-1',
      });

      const result = await resolver.wellKnownVirtualContributor(vc);
      expect(result).toBe(VirtualContributorWellKnown.CHAT_GUIDANCE);
    });

    it('should return undefined when VC is not mapped', async () => {
      const vc = { id: 'vc-unknown' } as any;
      platformWellKnownVCService.getMappings.mockResolvedValue({
        [VirtualContributorWellKnown.CHAT_GUIDANCE]: 'vc-1',
      });

      const result = await resolver.wellKnownVirtualContributor(vc);
      expect(result).toBeUndefined();
    });
  });

  describe('engine', () => {
    it('should return the engine from the AI server adapter', async () => {
      const vc = { id: 'vc-1', aiPersonaID: 'persona-1' } as any;
      aiServerAdapter.getPersonaEngine.mockResolvedValue('openai');

      const result = await resolver.engine(vc);
      expect(result).toBe('openai');
      expect(aiServerAdapter.getPersonaEngine).toHaveBeenCalledWith(
        'persona-1'
      );
    });
  });

  describe('aiPersona', () => {
    it('should return the AI persona from the adapter', async () => {
      const vc = { id: 'vc-1', aiPersonaID: 'persona-1' } as any;
      const mockPersona = { id: 'persona-1', engine: 'openai' };
      aiServerAdapter.getPersonaOrFail.mockResolvedValue(mockPersona);

      const result = await resolver.aiPersona(vc);
      expect(result).toBe(mockPersona);
    });
  });

  describe('modelCard', () => {
    it('should return model card with persona and engine', async () => {
      const vc = { id: 'vc-1', aiPersonaID: 'persona-1' } as any;
      const mockPersona = { id: 'persona-1' };
      aiServerAdapter.getPersonaEngine.mockResolvedValue('openai');
      aiServerAdapter.getPersonaOrFail.mockResolvedValue(mockPersona);

      const result = await resolver.modelCard(vc);

      expect(result).toEqual({
        aiPersona: mockPersona,
        aiPersonaEngine: 'openai',
      });
    });
  });

  describe('authorization', () => {
    it('should return the authorization from the parent entity', async () => {
      const vc = {
        id: 'vc-1',
        authorization: { id: 'auth-1' },
      } as any;

      const result = await resolver.authorization(vc);
      expect(result).toEqual({ id: 'auth-1' });
    });
  });

  describe('knowledgeBase', () => {
    it('should return knowledge base and check authorization', async () => {
      const mockKB = { id: 'kb-1', authorization: { id: 'kb-auth-1' } };
      const vc = { id: 'vc-1' } as any;
      const actorContext = { actorID: 'user-1' } as any;

      virtualContributorService.getKnowledgeBaseOrFail.mockResolvedValue(
        mockKB
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);

      const result = await resolver.knowledgeBase(vc, actorContext);

      expect(result).toBe(mockKB);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
    });
  });

  describe('provider', () => {
    it('should return the provider from the VC service', async () => {
      const mockProvider = { id: 'provider-1' };
      const vc = { id: 'vc-1' } as any;

      virtualContributorService.getProvider.mockResolvedValue(mockProvider);

      const result = await resolver.provider(vc);
      expect(result).toBe(mockProvider);
    });
  });

  describe('status', () => {
    it('should return READY when body of knowledge has been updated', async () => {
      const vc = { id: 'vc-1', aiPersonaID: 'persona-1' } as any;
      virtualContributorService.getBodyOfKnowledgeLastUpdated.mockResolvedValue(
        new Date()
      );

      const result = await resolver.status(vc);
      expect(result).toBe(VirtualContributorStatus.READY);
    });

    it('should return INITIALIZING when body of knowledge has not been updated', async () => {
      const vc = { id: 'vc-1', aiPersonaID: 'persona-1' } as any;
      virtualContributorService.getBodyOfKnowledgeLastUpdated.mockResolvedValue(
        null
      );

      const result = await resolver.status(vc);
      expect(result).toBe(VirtualContributorStatus.INITIALIZING);
    });
  });
});

describe('VirtualContributorResolverFields.promote', () => {
  let resolver: VirtualContributorResolverFields;
  let authorizationService: AuthorizationService;
  const platformPolicy = { id: 'platform-auth' } as any;
  const actorContext = { actorID: 'actor-1' } as any;
  const policyLoader = () =>
    ({ load: vi.fn().mockResolvedValue(platformPolicy) }) as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    resolver = module.get(VirtualContributorResolverFields);
    authorizationService = module.get(AuthorizationService);
  });

  it('a PLATFORM_PROMOTE_MANAGE holder reads the stored value (true and false alike), checked against the PLATFORM policy', async () => {
    vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
    const loader = policyLoader();

    expect(
      await resolver.promote({ promote: true } as any, actorContext, loader)
    ).toBe(true);
    expect(
      await resolver.promote({ promote: false } as any, actorContext, loader)
    ).toBe(false);
    expect(loader.load).toHaveBeenCalledWith(
      PlatformAuthorizationPolicyLoaderCreator.KEY
    );
    expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_PROMOTE_MANAGE
    );
  });

  it('anyone else gets null (absent, not false) and no error', async () => {
    vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);

    await expect(
      resolver.promote({ promote: true } as any, actorContext, policyLoader())
    ).resolves.toBeNull();
  });
});
