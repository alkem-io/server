import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TagsetTemplateSetService } from '@domain/common/tagset-template-set/tagset.template.set.service';
import { CalloutService } from '../callout/callout.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { CalloutsSet } from './callouts.set.entity';
import { CalloutsSetService } from './callouts.set.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('CalloutsSetService', () => {
  let service: CalloutsSetService;
  let repository: Repository<CalloutsSet>;
  let calloutService: CalloutService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let tagsetTemplateSetService: TagsetTemplateSetService;
  let namingService: NamingService;
  let storageAggregatorResolverService: StorageAggregatorResolverService;

  beforeEach(async () => {
    // Mock static CalloutsSet.create to avoid DataSource requirement
    vi.spyOn(CalloutsSet, 'create').mockImplementation((input: any) => {
      const entity = new CalloutsSet();
      Object.assign(entity, input);
      return entity as any;
    });
    // Mock static CalloutsSet.findOne (used by getCalloutsSetOrFail)
    vi.spyOn(CalloutsSet, 'findOne').mockResolvedValue(null as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutsSetService,
        repositoryProviderMockFactory(CalloutsSet),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutsSetService);
    repository = module.get(getRepositoryToken(CalloutsSet));
    calloutService = module.get(CalloutService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    tagsetTemplateSetService = module.get(TagsetTemplateSetService);
    namingService = module.get(NamingService);
    storageAggregatorResolverService = module.get(
      StorageAggregatorResolverService
    );
  });

  describe('createCalloutsSet', () => {
    it('should create a CalloutsSet with authorization, type, and empty callouts', () => {
      vi.mocked(
        tagsetTemplateSetService.createTagsetTemplateSet
      ).mockReturnValue({ id: 'tts-1' } as any);

      const result = service.createCalloutsSet(
        { calloutsData: [] },
        CalloutsSetType.COLLABORATION
      );

      expect(result.authorization).toBeDefined();
      expect(result.type).toBe(CalloutsSetType.COLLABORATION);
      expect(result.callouts).toEqual([]);
      expect(result.tagsetTemplateSet).toBeDefined();
    });

    it('should throw RelationshipNotFoundException when calloutsData is missing', () => {
      expect(() =>
        service.createCalloutsSet(
          { calloutsData: undefined } as any,
          CalloutsSetType.COLLABORATION
        )
      ).toThrow(RelationshipNotFoundException);
    });
  });

  describe('addTagsetTemplate', () => {
    it('should add tagset template to calloutsSet', () => {
      const originalTagsetTemplateSet = { id: 'tts-1', tagsetTemplates: [] };
      const calloutsSet = {
        id: 'cs-1',
        tagsetTemplateSet: originalTagsetTemplateSet,
      } as any;
      const tagsetInput = { name: 'custom', allowedValues: ['a'] } as any;

      vi.mocked(
        tagsetTemplateSetService.addTagsetTemplate
      ).mockReturnValue({ id: 'tts-1', tagsetTemplates: [tagsetInput] } as any);

      const result = service.addTagsetTemplate(calloutsSet, tagsetInput);

      expect(
        tagsetTemplateSetService.addTagsetTemplate
      ).toHaveBeenCalledWith(originalTagsetTemplateSet, tagsetInput);
    });

    it('should throw EntityNotInitializedException when tagsetTemplateSet is missing', () => {
      const calloutsSet = {
        id: 'cs-1',
        tagsetTemplateSet: undefined,
      } as any;

      expect(() =>
        service.addTagsetTemplate(calloutsSet, {} as any)
      ).toThrow(EntityNotInitializedException);
    });
  });

  describe('getTagsetTemplate', () => {
    it('should return matching tagset template by name', () => {
      const template = { name: 'flow-state', allowedValues: ['a'] } as any;
      const tagsetTemplateSet = {
        tagsetTemplates: [template, { name: 'other' }],
      } as any;

      const result = service.getTagsetTemplate(tagsetTemplateSet, 'flow-state');

      expect(result).toBe(template);
    });

    it('should return undefined when no matching template exists', () => {
      const tagsetTemplateSet = {
        tagsetTemplates: [{ name: 'other' }],
      } as any;

      const result = service.getTagsetTemplate(
        tagsetTemplateSet,
        'nonexistent'
      );

      expect(result).toBeUndefined();
    });
  });

  describe('validateNameIDNotInUseOrFail', () => {
    it('should not throw when nameID is not in use', async () => {
      vi.mocked(
        namingService.getReservedNameIDsInCalloutsSet
      ).mockResolvedValue(['existing-name']);

      await expect(
        service.validateNameIDNotInUseOrFail('cs-1', 'new-name')
      ).resolves.toBeUndefined();
    });

    it('should throw ValidationException when nameID is already in use', async () => {
      vi.mocked(
        namingService.getReservedNameIDsInCalloutsSet
      ).mockResolvedValue(['taken-name']);

      await expect(
        service.validateNameIDNotInUseOrFail('cs-1', 'taken-name')
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('deleteCalloutsSet', () => {
    it('should delete authorization, all callouts, and remove calloutsSet', async () => {
      const calloutsSet = {
        id: 'cs-1',
        authorization: { id: 'auth-1' },
        callouts: [{ id: 'c-1' }, { id: 'c-2' }],
      } as any;

      // getCalloutsSetOrFail uses CalloutsSet.findOne (static method)
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(repository.remove).mockResolvedValue(calloutsSet);

      await service.deleteCalloutsSet('cs-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        calloutsSet.authorization
      );
      expect(calloutService.deleteCallout).toHaveBeenCalledTimes(2);
      expect(repository.remove).toHaveBeenCalledWith(calloutsSet);
    });
  });

  describe('addCallouts', () => {
    it('should create callouts and generate unique nameIDs', async () => {
      const calloutsSet = {
        id: 'cs-1',
        tagsetTemplateSet: { tagsetTemplates: [] },
        callouts: [{ nameID: 'existing' }],
      } as any;
      const calloutsData = [
        {
          nameID: 'existing', // duplicate, should be regenerated
          framing: { profile: { displayName: 'Callout 1' } },
        },
        {
          nameID: 'unique',
          framing: { profile: { displayName: 'Callout 2' } },
        },
      ] as any[];
      const storageAggregator = { id: 'agg-1' } as any;

      vi.mocked(
        namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('callout-1-generated');
      vi.mocked(calloutService.createCallout).mockResolvedValue({
        id: 'new-callout',
      } as any);

      const results = await service.addCallouts(
        calloutsSet,
        calloutsData,
        storageAggregator,
        'user-1'
      );

      expect(results).toHaveLength(2);
      // First callout should have nameID regenerated because 'existing' is taken
      expect(
        namingService.createNameIdAvoidingReservedNameIDs
      ).toHaveBeenCalled();
    });

    it('should throw EntityNotInitializedException when tagsetTemplateSet is missing', async () => {
      const calloutsSet = {
        id: 'cs-1',
        tagsetTemplateSet: undefined,
        callouts: [],
      } as any;

      await expect(
        service.addCallouts(calloutsSet, [], {} as any, 'user-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('moveCalloutsToDefaultFlowState', () => {
    it('should assign default flow state to callouts without a flow state tagset', () => {
      const callouts = [
        {
          id: 'c-1',
          classification: {
            tagsets: [{ name: 'other', tags: ['val'] }],
          },
        },
      ] as any[];

      service.moveCalloutsToDefaultFlowState(['State A', 'State B'], callouts);

      const flowStateTagset = callouts[0].classification.tagsets.find(
        (t: any) => t.name === TagsetReservedName.FLOW_STATE
      );
      expect(flowStateTagset).toBeDefined();
      expect(flowStateTagset.tags).toEqual(['State A']);
    });

    it('should reset flow state to default when current state is invalid', () => {
      const callouts = [
        {
          id: 'c-1',
          classification: {
            tagsets: [
              {
                name: TagsetReservedName.FLOW_STATE,
                type: TagsetType.SELECT_ONE,
                tags: ['Invalid State'],
              },
            ],
          },
        },
      ] as any[];

      service.moveCalloutsToDefaultFlowState(['State A', 'State B'], callouts);

      const flowStateTagset = callouts[0].classification.tagsets.find(
        (t: any) => t.name === TagsetReservedName.FLOW_STATE
      );
      expect(flowStateTagset.tags).toEqual(['State A']);
    });

    it('should keep valid flow state unchanged', () => {
      const callouts = [
        {
          id: 'c-1',
          classification: {
            tagsets: [
              {
                name: TagsetReservedName.FLOW_STATE,
                type: TagsetType.SELECT_ONE,
                tags: ['State B'],
              },
            ],
          },
        },
      ] as any[];

      service.moveCalloutsToDefaultFlowState(['State A', 'State B'], callouts);

      const flowStateTagset = callouts[0].classification.tagsets.find(
        (t: any) => t.name === TagsetReservedName.FLOW_STATE
      );
      expect(flowStateTagset.tags).toEqual(['State B']);
    });

    it('should throw RelationshipNotFoundException when callout has no classification', () => {
      const callouts = [
        {
          id: 'c-1',
          classification: undefined,
        },
      ] as any[];

      expect(() =>
        service.moveCalloutsToDefaultFlowState(['State A'], callouts)
      ).toThrow(RelationshipNotFoundException);
    });
  });

  describe('updateCalloutsSortOrder', () => {
    it('should reorder callouts based on provided IDs', async () => {
      const callouts = [
        { id: 'c-1', nameID: 'n-1', sortOrder: 10 },
        { id: 'c-2', nameID: 'n-2', sortOrder: 20 },
        { id: 'c-3', nameID: 'n-3', sortOrder: 30 },
      ] as any[];

      const calloutsSet = { id: 'cs-1', callouts } as any;

      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet as any);
      vi.mocked(calloutService.save).mockImplementation(
        async (callout: any) => callout
      );

      const result = await service.updateCalloutsSortOrder(calloutsSet, {
        calloutIDs: ['c-3', 'c-1', 'c-2'],
      });

      expect(result).toHaveLength(3);
      // The sort orders should be based on the minimum sort order of the selected callouts
      expect(result[0].id).toBe('c-3');
      expect(result[1].id).toBe('c-1');
      expect(result[2].id).toBe('c-2');
    });

    it('should throw EntityNotFoundException when a callout ID is not found', async () => {
      const calloutsSet = {
        id: 'cs-1',
        callouts: [{ id: 'c-1', nameID: 'n-1', sortOrder: 1 }],
      } as any;

      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet as any);

      await expect(
        service.updateCalloutsSortOrder(calloutsSet, {
          calloutIDs: ['c-1', 'nonexistent'],
        })
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('createCalloutOnCalloutsSet', () => {
    it('should create callout with auto-generated sortOrder when not provided', async () => {
      const calloutsSet = {
        id: 'cs-1',
        callouts: [
          { nameID: 'c-1', sortOrder: 5 },
          { nameID: 'c-2', sortOrder: 3 },
        ],
        tagsetTemplateSet: { tagsetTemplates: [] },
      } as any;

      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(
        namingService.getReservedNameIDsInCalloutsSet
      ).mockResolvedValue(['c-1', 'c-2']);
      vi.mocked(
        namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('new-callout');
      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCalloutsSet
      ).mockResolvedValue({ id: 'agg-1' } as any);
      vi.mocked(calloutService.createCallout).mockResolvedValue({
        id: 'callout-new',
        calloutsSet: undefined,
      } as any);

      const calloutData = {
        calloutsSetID: 'cs-1',
        framing: { profile: { displayName: 'New Callout' } },
      } as any;

      const result = await service.createCalloutOnCalloutsSet(
        calloutData,
        'user-1'
      );

      // sortOrder should be min(5, 3, 0) - 1 = -1
      expect(calloutData.sortOrder).toBe(-1);
    });

    it('should throw ValidationException when nameID is already taken', async () => {
      const calloutsSet = {
        id: 'cs-1',
        callouts: [],
        tagsetTemplateSet: { tagsetTemplates: [] },
      } as any;

      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(
        namingService.getReservedNameIDsInCalloutsSet
      ).mockResolvedValue(['taken-name']);

      const calloutData = {
        calloutsSetID: 'cs-1',
        nameID: 'taken-name',
        framing: { profile: { displayName: 'Test' } },
      } as any;

      await expect(
        service.createCalloutOnCalloutsSet(calloutData, 'user-1')
      ).rejects.toThrow(ValidationException);
    });
  });
});
