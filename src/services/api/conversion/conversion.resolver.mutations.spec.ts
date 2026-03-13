import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutTransferService } from '@domain/collaboration/callout-transfer/callout.transfer.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { ConversionResolverMutations } from './conversion.resolver.mutations';
import { ConversionService } from './conversion.service';

describe('ConversionResolverMutations', () => {
  let resolver: ConversionResolverMutations;
  let authorizationService: { grantAccessOrFail: Mock };
  let conversionService: {
    convertSpaceL1ToSpaceL0OrFail: Mock;
    convertSpaceL2ToSpaceL1OrFail: Mock;
    convertSpaceL1ToSpaceL2OrFail: Mock;
  };
  let spaceService: {
    save: Mock;
    getSpaceOrFail: Mock;
    getAccountForLevelZeroSpaceOrFail: Mock;
  };
  let spaceAuthorizationService: { applyAuthorizationPolicy: Mock };
  let authorizationPolicyService: {
    saveAll: Mock;
    createGlobalRolesAuthorizationPolicy: Mock;
  };
  let virtualContributorService: {
    getVirtualContributorByIdOrFail: Mock;
  };
  let _calloutTransferService: { transferCallout: Mock };

  const actorContext = { actorID: 'actor-1', credentials: [] } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversionResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ConversionResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    conversionService = module.get(ConversionService) as any;
    spaceService = module.get(SpaceService) as any;
    spaceAuthorizationService = module.get(SpaceAuthorizationService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    virtualContributorService = module.get(VirtualContributorService) as any;
    _calloutTransferService = module.get(CalloutTransferService) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('convertSpaceL1ToSpaceL0', () => {
    it('should check platform admin authorization and call conversion service', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      const convertedSpace = { id: 'space-l0' };
      conversionService.convertSpaceL1ToSpaceL0OrFail.mockResolvedValue(
        convertedSpace
      );
      spaceService.save.mockResolvedValue(convertedSpace);
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      spaceService.getSpaceOrFail.mockResolvedValue(convertedSpace);

      const result = await resolver.convertSpaceL1ToSpaceL0(actorContext, {
        spaceL1ID: 'space-l1',
      });

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        expect.anything(),
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(
        conversionService.convertSpaceL1ToSpaceL0OrFail
      ).toHaveBeenCalledWith({ spaceL1ID: 'space-l1' });
      expect(result).toBe(convertedSpace);
    });
  });

  describe('convertSpaceL2ToSpaceL1', () => {
    it('should check authorization and call conversion service', async () => {
      const convertedSpace = {
        id: 'space-l1',
        parentSpace: { authorization: { id: 'auth-parent' } },
      };
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      conversionService.convertSpaceL2ToSpaceL1OrFail.mockResolvedValue(
        convertedSpace
      );
      spaceService.save.mockResolvedValue(convertedSpace);
      spaceService.getSpaceOrFail.mockResolvedValue(convertedSpace);
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const result = await resolver.convertSpaceL2ToSpaceL1(actorContext, {
        spaceL2ID: 'space-l2',
      });

      expect(
        conversionService.convertSpaceL2ToSpaceL1OrFail
      ).toHaveBeenCalledWith({ spaceL2ID: 'space-l2' });
      expect(result).toBe(convertedSpace);
    });
  });

  describe('convertSpaceL1ToSpaceL2', () => {
    it('should check authorization and call conversion service', async () => {
      const convertedSpace = {
        id: 'space-l2',
        parentSpace: { authorization: { id: 'auth-parent' } },
      };
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      conversionService.convertSpaceL1ToSpaceL2OrFail.mockResolvedValue(
        convertedSpace
      );
      spaceService.save.mockResolvedValue(convertedSpace);
      spaceService.getSpaceOrFail.mockResolvedValue(convertedSpace);
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const result = await resolver.convertSpaceL1ToSpaceL2(actorContext, {
        spaceL1ID: 'space-l1',
        parentSpaceL1ID: 'parent-l1',
      });

      expect(
        conversionService.convertSpaceL1ToSpaceL2OrFail
      ).toHaveBeenCalledWith({
        spaceL1ID: 'space-l1',
        parentSpaceL1ID: 'parent-l1',
      });
      expect(result).toBe(convertedSpace);
    });
  });

  describe('convertVirtualContributorToUseKnowledgeBase', () => {
    it('should check authorization and throw when VC is missing entities', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: undefined,
          account: undefined,
        }
      );

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });

    it('should throw when VC is not of type ALKEMIO_SPACE', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: { calloutsSet: { id: 'cs-1' } },
          account: { id: 'acc-1' },
          bodyOfKnowledgeType: 'OTHER_TYPE',
          bodyOfKnowledgeID: 'body-1',
        }
      );

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });

    it('should throw when VC has no body of knowledge ID', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: { calloutsSet: { id: 'cs-1' } },
          account: { id: 'acc-1' },
          bodyOfKnowledgeType: 'alkemio-space',
          bodyOfKnowledgeID: undefined,
        }
      );

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });

    it('should throw when space is missing collaboration entities', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: { calloutsSet: { id: 'cs-1' } },
          account: { id: 'acc-1' },
          bodyOfKnowledgeType: 'alkemio-space',
          bodyOfKnowledgeID: 'space-1',
        }
      );
      spaceService.getSpaceOrFail.mockResolvedValue({
        id: 'space-1',
        collaboration: undefined,
      });

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });

    it('should throw when VC and space belong to different accounts', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: { calloutsSet: { id: 'cs-1' } },
          account: { id: 'acc-1' },
          bodyOfKnowledgeType: 'alkemio-space',
          bodyOfKnowledgeID: 'space-1',
        }
      );
      spaceService.getSpaceOrFail.mockResolvedValue({
        id: 'space-1',
        collaboration: {
          calloutsSet: { id: 'cs-2', callouts: [] },
        },
      });
      spaceService.getAccountForLevelZeroSpaceOrFail.mockResolvedValue({ id: 'acc-2' });

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });
  });
});
