import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutTransferService } from '@domain/collaboration/callout-transfer/callout.transfer.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { createMock } from '@golevelup/ts-vitest';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { ConversionResolverMutations } from './conversion.resolver.mutations';
import { ConversionService } from './conversion.service';

const actorContext = { actorID: 'user-1' } as any;

describe('ConversionResolverMutations', () => {
  let resolver: ConversionResolverMutations;
  let conversionService: ReturnType<typeof createMock<ConversionService>>;
  let spaceService: ReturnType<typeof createMock<SpaceService>>;
  let vcService: ReturnType<typeof createMock<VirtualContributorService>>;
  let authPolicyService: ReturnType<
    typeof createMock<AuthorizationPolicyService>
  >;

  beforeEach(() => {
    const authService = createMock<AuthorizationService>();
    authPolicyService = createMock<AuthorizationPolicyService>();
    conversionService = createMock<ConversionService>();
    const spaceAuthService = createMock<SpaceAuthorizationService>();
    spaceService = createMock<SpaceService>();
    vcService = createMock<VirtualContributorService>();
    const vcAuthService = createMock<VirtualContributorAuthorizationService>();
    const calloutTransferService = createMock<CalloutTransferService>();
    const aiServerAdapter = createMock<AiServerAdapter>();
    const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };

    authPolicyService.createGlobalRolesAuthorizationPolicy.mockReturnValue({
      id: 'global-policy',
    } as any);
    conversionService.convertSpaceL1ToSpaceL0OrFail.mockResolvedValue({
      id: 'space-1',
    } as any);
    conversionService.convertSpaceL2ToSpaceL1OrFail.mockResolvedValue({
      id: 'space-2',
    } as any);
    conversionService.convertSpaceL1ToSpaceL2OrFail.mockResolvedValue({
      id: 'space-3',
    } as any);
    spaceService.save.mockImplementation(async (s: any) => s);
    spaceService.getSpaceOrFail.mockResolvedValue({
      id: 'space-1',
      parentSpace: { authorization: { id: 'parent-auth' } },
    } as any);
    spaceAuthService.applyAuthorizationPolicy.mockResolvedValue([]);
    authPolicyService.saveAll.mockResolvedValue(undefined as any);

    resolver = new ConversionResolverMutations(
      authService,
      authPolicyService,
      conversionService,
      spaceAuthService,
      spaceService,
      vcService,
      vcAuthService,
      calloutTransferService,
      aiServerAdapter,
      logger as any
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should convert space L1 to L0', async () => {
    const input = { spaceL1ID: 'space-1' };
    const result = await resolver.convertSpaceL1ToSpaceL0(
      actorContext,
      input as any
    );
    expect(result).toBeDefined();
    expect(
      conversionService.convertSpaceL1ToSpaceL0OrFail
    ).toHaveBeenCalledWith(input);
  });

  it('should convert space L2 to L1', async () => {
    const input = { spaceL2ID: 'space-2' };
    const result = await resolver.convertSpaceL2ToSpaceL1(
      actorContext,
      input as any
    );
    expect(result).toBeDefined();
    expect(
      conversionService.convertSpaceL2ToSpaceL1OrFail
    ).toHaveBeenCalledWith(input);
  });

  it('should convert space L1 to L2', async () => {
    const input = { spaceL1ID: 'space-1', parentSpaceL1ID: 'parent-1' };
    const result = await resolver.convertSpaceL1ToSpaceL2(
      actorContext,
      input as any
    );
    expect(result).toBeDefined();
    expect(
      conversionService.convertSpaceL1ToSpaceL2OrFail
    ).toHaveBeenCalledWith(input);
  });

  it('should convert VC from space to knowledge base', async () => {
    vcService.getVirtualContributorByIdOrFail.mockResolvedValue({
      id: 'vc-1',
      bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
      bodyOfKnowledgeID: 'space-1',
      knowledgeBase: { calloutsSet: { id: 'cs-1' } },
      account: { id: 'account-1' },
    } as any);
    spaceService.getSpaceOrFail.mockResolvedValue({
      id: 'space-1',
      collaboration: {
        calloutsSet: {
          id: 'src-cs',
          callouts: [{ id: 'callout-1' }],
        },
      },
    } as any);
    spaceService.getAccountForLevelZeroSpaceOrFail.mockResolvedValue({
      id: 'account-1',
    } as any);

    const input = { virtualContributorID: 'vc-1' };
    const result = await resolver.convertVirtualContributorToUseKnowledgeBase(
      actorContext,
      input as any
    );
    expect(result).toBeDefined();
  });

  it('should throw when VC is not of type ALKEMIO_SPACE', async () => {
    vcService.getVirtualContributorByIdOrFail.mockResolvedValue({
      id: 'vc-1',
      bodyOfKnowledgeType:
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE,
      knowledgeBase: { calloutsSet: { id: 'cs-1' } },
      account: { id: 'account-1' },
    } as any);

    const input = { virtualContributorID: 'vc-1' };
    await expect(
      resolver.convertVirtualContributorToUseKnowledgeBase(
        actorContext,
        input as any
      )
    ).rejects.toThrow();
  });

  it('should throw when VC and space have different accounts', async () => {
    vcService.getVirtualContributorByIdOrFail.mockResolvedValue({
      id: 'vc-1',
      bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
      bodyOfKnowledgeID: 'space-1',
      knowledgeBase: { calloutsSet: { id: 'cs-1' } },
      account: { id: 'account-1' },
    } as any);
    spaceService.getSpaceOrFail.mockResolvedValue({
      id: 'space-1',
      collaboration: {
        calloutsSet: { id: 'src-cs', callouts: [] },
      },
    } as any);
    spaceService.getAccountForLevelZeroSpaceOrFail.mockResolvedValue({
      id: 'account-different',
    } as any);

    const input = { virtualContributorID: 'vc-1' };
    await expect(
      resolver.convertVirtualContributorToUseKnowledgeBase(
        actorContext,
        input as any
      )
    ).rejects.toThrow();
  });
});
