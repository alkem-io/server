import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi, type Mock } from 'vitest';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { VirtualContributorDefaultsService } from './virtual.contributor.defaults.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';

describe('VirtualContributorDefaultsService', () => {
  let service: VirtualContributorDefaultsService;
  let namingService: {
    getReservedNameIDsInVirtualContributors: Mock;
    createNameIdAvoidingReservedNameIDs: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorDefaultsService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VirtualContributorDefaultsService);
    namingService = module.get(NamingService) as any;
  });

  describe('createVirtualContributorNameID', () => {
    it('should generate a nameID based on the display name and reserved names', async () => {
      namingService.getReservedNameIDsInVirtualContributors.mockResolvedValue(['reserved-1']);
      namingService.createNameIdAvoidingReservedNameIDs.mockReturnValue('my-vc');

      const result = await service.createVirtualContributorNameID('My VC');

      expect(namingService.getReservedNameIDsInVirtualContributors).toHaveBeenCalled();
      expect(namingService.createNameIdAvoidingReservedNameIDs).toHaveBeenCalledWith(
        'My VC',
        ['reserved-1']
      );
      expect(result).toBe('my-vc');
    });
  });

  describe('createKnowledgeBaseInput', () => {
    it('should create default knowledge base input when no data is provided', async () => {
      const result = await service.createKnowledgeBaseInput();

      expect(result.profile.displayName).toBe('Knowledge Base');
      expect(result.calloutsSetData).toBeDefined();
      expect(result.calloutsSetData!.calloutsData).toEqual([]);
    });

    it('should preserve provided display name and not override it', async () => {
      const result = await service.createKnowledgeBaseInput({
        profile: { displayName: 'Custom KB' },
        calloutsSetData: {},
      });

      expect(result.profile.displayName).toBe('Custom KB');
    });

    it('should set default display name to Knowledge Base when empty string is provided', async () => {
      const result = await service.createKnowledgeBaseInput({
        profile: { displayName: '' },
        calloutsSetData: {},
      });

      expect(result.profile.displayName).toBe('Knowledge Base');
    });

    it('should use default callout inputs for ALKEMIO_KNOWLEDGE_BASE type when no callouts provided', async () => {
      const defaultCallouts: CreateCalloutInput[] = [
        { framing: { profile: { displayName: 'Default Callout' } } } as any,
      ];

      const result = await service.createKnowledgeBaseInput(
        undefined,
        defaultCallouts,
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE
      );

      expect(result.calloutsSetData!.calloutsData).toBe(defaultCallouts);
    });

    it('should use empty callouts for non-ALKEMIO_KNOWLEDGE_BASE types when no callouts provided', async () => {
      const defaultCallouts: CreateCalloutInput[] = [
        { framing: { profile: { displayName: 'Default Callout' } } } as any,
      ];

      const result = await service.createKnowledgeBaseInput(
        undefined,
        defaultCallouts,
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE
      );

      expect(result.calloutsSetData!.calloutsData).toEqual([]);
    });

    it('should preserve provided callout data regardless of body of knowledge type', async () => {
      const providedCallouts: CreateCalloutInput[] = [
        { framing: { profile: { displayName: 'Provided' } } } as any,
      ];

      const result = await service.createKnowledgeBaseInput(
        {
          profile: { displayName: 'My KB' },
          calloutsSetData: { calloutsData: providedCallouts },
        },
        [{ framing: { profile: { displayName: 'Default' } } } as any],
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE
      );

      expect(result.calloutsSetData!.calloutsData).toBe(providedCallouts);
    });

    it('should initialize calloutsSetData when not provided in input', async () => {
      const result = await service.createKnowledgeBaseInput({
        profile: { displayName: 'My KB' },
      } as any);

      expect(result.calloutsSetData).toBeDefined();
      expect(result.calloutsSetData!.calloutsData).toEqual([]);
    });

    it('should initialize profile when not provided in input', async () => {
      const result = await service.createKnowledgeBaseInput({
        calloutsSetData: {},
      } as any);

      expect(result.profile).toBeDefined();
      expect(result.profile.displayName).toBe('Knowledge Base');
    });
  });
});
