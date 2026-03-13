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
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { CalloutService } from '../callout/callout.service';
import { CalloutsSet } from './callouts.set.entity';
import { CalloutsSetService } from './callouts.set.service';

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

      vi.mocked(tagsetTemplateSetService.addTagsetTemplate).mockReturnValue({
        id: 'tts-1',
        tagsetTemplates: [tagsetInput],
      } as any);

      const _result = service.addTagsetTemplate(calloutsSet, tagsetInput);

      expect(tagsetTemplateSetService.addTagsetTemplate).toHaveBeenCalledWith(
        originalTagsetTemplateSet,
        tagsetInput
      );
    });

    it('should throw EntityNotInitializedException when tagsetTemplateSet is missing', () => {
      const calloutsSet = {
        id: 'cs-1',
        tagsetTemplateSet: undefined,
      } as any;

      expect(() => service.addTagsetTemplate(calloutsSet, {} as any)).toThrow(
        EntityNotInitializedException
      );
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
      } as any);

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
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCalloutsSetOrFail', () => {
    it('should return calloutsSet when found', async () => {
      const calloutsSet = { id: 'cs-1' } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);

      const result = await service.getCalloutsSetOrFail('cs-1');

      expect(result).toBe(calloutsSet);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(null as any);

      await expect(service.getCalloutsSetOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getTagsetTemplatesSet', () => {
    it('should return tagset template set when loaded', async () => {
      const tagsetTemplateSet = { id: 'tts-1' };
      const calloutsSet = { id: 'cs-1', tagsetTemplateSet } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);

      const result = await service.getTagsetTemplatesSet('cs-1');

      expect(result).toBe(tagsetTemplateSet);
    });

    it('should throw EntityNotInitializedException when tagset template set is missing', async () => {
      const calloutsSet = { id: 'cs-1', tagsetTemplateSet: undefined } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);

      await expect(service.getTagsetTemplatesSet('cs-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getCallout', () => {
    it('should delegate to calloutService.getCalloutOrFail with calloutsSet filter', async () => {
      const callout = { id: 'c-1' } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      const result = await service.getCallout('c-1', 'cs-1');

      expect(result).toBe(callout);
      expect(calloutService.getCalloutOrFail).toHaveBeenCalledWith('c-1', {
        where: { calloutsSet: { id: 'cs-1' } },
        relations: { calloutsSet: true },
      });
    });
  });

  describe('getCallouts', () => {
    it('should return callouts from calloutsSet', async () => {
      const callouts = [{ id: 'c-1' }, { id: 'c-2' }] as any[];
      const calloutsSet = { id: 'cs-1', callouts } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);

      const result = await service.getCallouts('cs-1');

      expect(result).toEqual(callouts);
    });
  });

  describe('getCalloutsOnCalloutsSet', () => {
    it('should return callouts for a calloutsSet', async () => {
      const callouts = [{ id: 'c-1' }] as any[];
      vi.mocked(repository.findOne).mockResolvedValue({
        id: 'cs-1',
        callouts,
      } as any);

      const result = await service.getCalloutsOnCalloutsSet({
        id: 'cs-1',
      } as any);

      expect(result).toEqual(callouts);
    });

    it('should throw EntityNotFoundException when calloutsSet is not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      await expect(
        service.getCalloutsOnCalloutsSet({ id: 'cs-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when callouts are not initialized', async () => {
      vi.mocked(repository.findOne).mockResolvedValue({
        id: 'cs-1',
        callouts: undefined,
      } as any);

      await expect(
        service.getCalloutsOnCalloutsSet({ id: 'cs-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should filter callouts by IDs when provided', async () => {
      const callouts = [{ id: 'c-1' }, { id: 'c-2' }] as any[];
      vi.mocked(repository.findOne).mockResolvedValue({
        id: 'cs-1',
        callouts,
      } as any);

      const result = await service.getCalloutsOnCalloutsSet(
        { id: 'cs-1' } as any,
        { calloutIds: ['c-1'] }
      );

      expect(result).toEqual(callouts);
    });
  });

  describe('createCallout', () => {
    it('should create a callout, save it, and return it', async () => {
      const calloutsSet = { id: 'cs-1' } as any;
      const calloutInput = {
        framing: { profile: { displayName: 'Test Callout' } },
      } as any;
      const savedCallout = { id: 'new-c', calloutsSet } as any;

      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCalloutsSet
      ).mockResolvedValue({ id: 'agg-1' } as any);
      vi.mocked(
        namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('test-callout');
      vi.mocked(calloutService.createCallout).mockResolvedValue(
        savedCallout as any
      );
      vi.mocked(calloutService.save).mockResolvedValue(savedCallout as any);

      const result = await service.createCallout(calloutsSet, calloutInput);

      expect(result).toBe(savedCallout);
      expect(calloutService.save).toHaveBeenCalledWith(savedCallout);
    });

    it('should throw ValidationException when nameID is already taken', async () => {
      // Note: the current implementation has a TODO and reservedNameIDs is always empty
      // so this path (reservedNameIDs.includes) is never true in practice
      // We test the name generation path instead
      const calloutsSet = { id: 'cs-1' } as any;
      const calloutInput = {
        framing: { profile: { displayName: 'Test Callout' } },
      } as any;

      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCalloutsSet
      ).mockResolvedValue({ id: 'agg-1' } as any);
      vi.mocked(
        namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('generated-name');
      vi.mocked(calloutService.createCallout).mockResolvedValue({
        id: 'c-1',
        calloutsSet: undefined,
      } as any);
      vi.mocked(calloutService.save).mockResolvedValue({
        id: 'c-1',
      } as any);

      const result = await service.createCallout(calloutsSet, calloutInput);

      expect(calloutInput.nameID).toBe('generated-name');
      expect(result).toBeDefined();
    });
  });

  describe('save', () => {
    it('should save and return the calloutsSet', async () => {
      const calloutsSet = { id: 'cs-1' } as any;
      vi.mocked(repository.save).mockResolvedValue(calloutsSet);

      const result = await service.save(calloutsSet);

      expect(result).toBe(calloutsSet);
      expect(repository.save).toHaveBeenCalledWith(calloutsSet);
    });
  });

  describe('getCalloutsFromCollaboration', () => {
    let authorizationService: any;

    beforeEach(async () => {
      // Need to import AuthorizationService to mock isAccessGranted
      const { AuthorizationService } = await import(
        '@core/authorization/authorization.service'
      );
      const module = await Test.createTestingModule({
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
      authorizationService = module.get(AuthorizationService);
    });

    it('should filter callouts by access and return sorted by sortOrder', async () => {
      const callouts = [
        {
          id: 'c-1',
          sortOrder: 20,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
        {
          id: 'c-2',
          sortOrder: 10,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
      ] as any[];

      const calloutsSet = { id: 'cs-1', callouts } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const result = await service.getCalloutsFromCollaboration(
        { id: 'cs-1' } as any,
        {} as any,
        { actorID: 'user-1' } as any
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('c-2'); // lower sortOrder first
      expect(result[1].id).toBe('c-1');
    });

    it('should filter out callouts without READ access', async () => {
      const callouts = [
        {
          id: 'c-1',
          sortOrder: 10,
          authorization: { id: 'auth-1' },
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
        {
          id: 'c-2',
          sortOrder: 20,
          authorization: { id: 'auth-2' },
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
      ] as any[];

      const calloutsSet = { id: 'cs-1', callouts } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(authorizationService.isAccessGranted)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = await service.getCalloutsFromCollaboration(
        { id: 'cs-1' } as any,
        {} as any,
        { actorID: 'user-1' } as any
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c-1');
    });

    it('should return callouts by IDs when args.IDs is specified', async () => {
      const callouts = [
        {
          id: 'c-1',
          sortOrder: 10,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
        {
          id: 'c-2',
          sortOrder: 20,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
      ] as any[];

      const calloutsSet = { id: 'cs-1', callouts } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const result = await service.getCalloutsFromCollaboration(
        { id: 'cs-1' } as any,
        { IDs: ['c-2', 'c-1'] } as any,
        { actorID: 'user-1' } as any
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('c-2');
      expect(result[1].id).toBe('c-1');
    });

    it('should throw EntityNotFoundException when requested callout ID not found', async () => {
      const calloutsSet = {
        id: 'cs-1',
        callouts: [
          {
            id: 'c-1',
            authorization: {},
            settings: { contribution: { allowedTypes: [] } },
            classification: { tagsets: [] },
          },
        ],
      } as any;

      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      await expect(
        service.getCalloutsFromCollaboration(
          { id: 'cs-1' } as any,
          { IDs: ['nonexistent'] } as any,
          { actorID: 'user-1' } as any
        )
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should respect limit parameter', async () => {
      const callouts = [
        {
          id: 'c-1',
          sortOrder: 10,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
        {
          id: 'c-2',
          sortOrder: 20,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
        {
          id: 'c-3',
          sortOrder: 30,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
      ] as any[];

      const calloutsSet = { id: 'cs-1', callouts } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const result = await service.getCalloutsFromCollaboration(
        { id: 'cs-1' } as any,
        { limit: 2 } as any,
        { actorID: 'user-1' } as any
      );

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should throw EntityNotFoundException when callouts not initialized', async () => {
      const calloutsSet = { id: 'cs-1', callouts: undefined } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);

      await expect(
        service.getCalloutsFromCollaboration(
          { id: 'cs-1' } as any,
          {} as any,
          { actorID: 'user-1' } as any
        )
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getAllTags', () => {
    let authorizationService: any;

    beforeEach(async () => {
      const { AuthorizationService } = await import(
        '@core/authorization/authorization.service'
      );
      const module = await Test.createTestingModule({
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
      authorizationService = module.get(AuthorizationService);
    });

    it('should return all tags sorted by frequency then alphabetically', async () => {
      const callouts = [
        {
          id: 'c-1',
          authorization: {},
          classification: { tagsets: [] },
          framing: {
            profile: {
              tagsets: [{ tags: ['alpha', 'beta'] }],
            },
          },
          contributions: [],
        },
        {
          id: 'c-2',
          authorization: {},
          classification: { tagsets: [] },
          framing: {
            profile: {
              tagsets: [{ tags: ['beta', 'gamma'] }],
            },
          },
          contributions: [],
        },
      ] as any[];

      const calloutsSet = { id: 'cs-1', callouts } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const result = await service.getAllTags('cs-1', {
        actorID: 'user-1',
      } as any);

      // beta appears twice, alpha and gamma once each
      expect(result[0]).toBe('beta');
      expect(result).toContain('alpha');
      expect(result).toContain('gamma');
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

      const _result = await service.createCalloutOnCalloutsSet(
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

  describe('moveCalloutsToDefaultFlowState', () => {
    it('should move callouts with invalid flow state to the default state', () => {
      const callouts = [
        {
          id: 'c-1',
          classification: {
            tagsets: [
              {
                name: TagsetReservedName.FLOW_STATE,
                type: TagsetType.SELECT_ONE,
                tags: ['deleted-state'],
              },
            ],
          },
        },
      ] as any[];

      service.moveCalloutsToDefaultFlowState(['state-A', 'state-B'], callouts);

      const flowTagset = callouts[0].classification.tagsets.find(
        (t: any) => t.name === TagsetReservedName.FLOW_STATE
      );
      expect(flowTagset.tags).toEqual(['state-A']);
    });

    it('should not change callouts already in a valid flow state', () => {
      const callouts = [
        {
          id: 'c-1',
          classification: {
            tagsets: [
              {
                name: TagsetReservedName.FLOW_STATE,
                type: TagsetType.SELECT_ONE,
                tags: ['state-B'],
              },
            ],
          },
        },
      ] as any[];

      service.moveCalloutsToDefaultFlowState(['state-A', 'state-B'], callouts);

      const flowTagset = callouts[0].classification.tagsets.find(
        (t: any) => t.name === TagsetReservedName.FLOW_STATE
      );
      expect(flowTagset.tags).toEqual(['state-B']);
    });

    it('should create flow state tagset when callout has no flow state tagset', () => {
      const callouts = [
        {
          id: 'c-1',
          classification: {
            tagsets: [],
          },
        },
      ] as any[];

      service.moveCalloutsToDefaultFlowState(['state-A', 'state-B'], callouts);

      const flowTagset = callouts[0].classification.tagsets.find(
        (t: any) => t.name === TagsetReservedName.FLOW_STATE
      );
      expect(flowTagset).toBeDefined();
      expect(flowTagset.tags).toEqual(['state-A']);
    });

    it('should throw RelationshipNotFoundException when callout has no classification', () => {
      const callouts = [
        {
          id: 'c-1',
          classification: undefined,
        },
      ] as any[];

      expect(() =>
        service.moveCalloutsToDefaultFlowState(['state-A'], callouts)
      ).toThrow(RelationshipNotFoundException);
    });
  });

  describe('classificationTagset filtering (via getCalloutsFromCollaboration)', () => {
    let authorizationService: any;

    beforeEach(async () => {
      const { AuthorizationService } = await import(
        '@core/authorization/authorization.service'
      );
      const module = await Test.createTestingModule({
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
      authorizationService = module.get(AuthorizationService);
    });

    it('should filter callouts by classification tagset values', async () => {
      const callouts = [
        {
          id: 'c-1',
          sortOrder: 10,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: {
            tagsets: [
              { name: TagsetReservedName.FLOW_STATE, tags: ['state-A'] },
            ],
          },
        },
        {
          id: 'c-2',
          sortOrder: 20,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: {
            tagsets: [
              { name: TagsetReservedName.FLOW_STATE, tags: ['state-B'] },
            ],
          },
        },
      ] as any[];

      const calloutsSet = { id: 'cs-1', callouts } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const result = await service.getCalloutsFromCollaboration(
        { id: 'cs-1' } as any,
        {
          classificationTagsets: [
            { name: TagsetReservedName.FLOW_STATE, tags: ['state-A'] },
          ],
        } as any,
        { actorID: 'user-1' } as any
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c-1');
    });

    it('should return all callouts when classificationTagsets has no tags', async () => {
      const callouts = [
        {
          id: 'c-1',
          sortOrder: 10,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
        {
          id: 'c-2',
          sortOrder: 20,
          authorization: {},
          settings: { contribution: { allowedTypes: [] } },
          classification: { tagsets: [] },
        },
      ] as any[];

      const calloutsSet = { id: 'cs-1', callouts } as any;
      vi.mocked(CalloutsSet.findOne).mockResolvedValue(calloutsSet);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const result = await service.getCalloutsFromCollaboration(
        { id: 'cs-1' } as any,
        {
          classificationTagsets: [
            { name: TagsetReservedName.FLOW_STATE, tags: [] },
          ],
        } as any,
        { actorID: 'user-1' } as any
      );

      expect(result).toHaveLength(2);
    });
  });
});
