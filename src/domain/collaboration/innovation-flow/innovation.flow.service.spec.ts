import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ProfileService } from '@domain/common/profile/profile.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { TagsetTemplateService } from '@domain/common/tagset-template/tagset.template.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { InnovationFlowStateService } from '../innovation-flow-state/innovation.flow.state.service';
import { InnovationFlow } from './innovation.flow.entity';
import { InnovationFlowService } from './innovation.flow.service';

describe('InnovationFlowService', () => {
  let service: InnovationFlowService;
  let repository: Repository<InnovationFlow>;
  let profileService: ProfileService;
  let tagsetService: TagsetService;
  let tagsetTemplateService: TagsetTemplateService;
  let innovationFlowStateService: InnovationFlowStateService;
  let _calloutsSetService: CalloutsSetService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Mock static InnovationFlow.create to avoid DataSource requirement
    vi.spyOn(InnovationFlow, 'create').mockImplementation((input: any) => {
      const entity = new InnovationFlow();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationFlowService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(InnovationFlow),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InnovationFlowService>(InnovationFlowService);
    repository = module.get(getRepositoryToken(InnovationFlow));
    profileService = module.get(ProfileService);
    tagsetService = module.get(TagsetService);
    tagsetTemplateService = module.get(TagsetTemplateService);
    innovationFlowStateService = module.get(InnovationFlowStateService);
    _calloutsSetService = module.get(CalloutsSetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateInnovationFlowDefinition', () => {
    it('should throw ValidationException when states array is empty', () => {
      expect(() => service.validateInnovationFlowDefinition([])).toThrow(
        ValidationException
      );
    });

    it('should not throw when states have valid unique names', () => {
      const states = [
        { displayName: 'State A' },
        { displayName: 'State B' },
      ] as any[];

      expect(() =>
        service.validateInnovationFlowDefinition(states)
      ).not.toThrow();
    });

    it('should throw ValidationException when state names are not unique', () => {
      const states = [
        { displayName: 'State A' },
        { displayName: 'State A' },
      ] as any[];

      expect(() => service.validateInnovationFlowDefinition(states)).toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when state names contain commas', () => {
      const states = [{ displayName: 'State,A' }] as any[];

      expect(() => service.validateInnovationFlowDefinition(states)).toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when states exceed maximumNumberOfStates', () => {
      const states = [
        { displayName: 'A' },
        { displayName: 'B' },
        { displayName: 'C' },
      ] as any[];
      const settings = {
        maximumNumberOfStates: 2,
        minimumNumberOfStates: 1,
      } as any;

      expect(() =>
        service.validateInnovationFlowDefinition(states, settings)
      ).toThrow(ValidationException);
    });

    it('should throw ValidationException when states are below minimumNumberOfStates', () => {
      const states = [{ displayName: 'A' }] as any[];
      const settings = {
        maximumNumberOfStates: 10,
        minimumNumberOfStates: 2,
      } as any;

      expect(() =>
        service.validateInnovationFlowDefinition(states, settings)
      ).toThrow(ValidationException);
    });

    it('should pass when states are within settings bounds', () => {
      const states = [{ displayName: 'A' }, { displayName: 'B' }] as any[];
      const settings = {
        maximumNumberOfStates: 5,
        minimumNumberOfStates: 1,
      } as any;

      expect(() =>
        service.validateInnovationFlowDefinition(states, settings)
      ).not.toThrow();
    });
  });

  describe('getInnovationFlowOrFail', () => {
    it('should return innovation flow when found', async () => {
      const flow = { id: 'flow-1' } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);

      const result = await service.getInnovationFlowOrFail('flow-1');

      expect(result).toBe(flow);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      await expect(
        service.getInnovationFlowOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('save', () => {
    it('should save and return the innovation flow', async () => {
      const flow = { id: 'flow-1' } as any;
      vi.mocked(repository.save).mockResolvedValue(flow);

      const result = await service.save(flow);

      expect(result).toBe(flow);
      expect(repository.save).toHaveBeenCalledWith(flow);
    });
  });

  describe('getProfile', () => {
    it('should return profile when it exists', async () => {
      const profile = { id: 'profile-1' };
      const flow = { id: 'flow-1', profile } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);

      const result = await service.getProfile({ id: 'flow-1' } as any);

      expect(result).toBe(profile);
    });

    it('should throw EntityNotFoundException when profile is not initialized', async () => {
      const flow = { id: 'flow-1', profile: undefined } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);

      await expect(service.getProfile({ id: 'flow-1' } as any)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getStates', () => {
    it('should return sorted states', async () => {
      const states = [
        { id: 's-2', sortOrder: 20, defaultCalloutTemplate: null },
        { id: 's-1', sortOrder: 10, defaultCalloutTemplate: null },
      ];
      const flow = { id: 'flow-1', states } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);

      const result = await service.getStates('flow-1');

      expect(result[0].id).toBe('s-1');
      expect(result[1].id).toBe('s-2');
    });

    it('should throw EntityNotFoundException when states are not initialized', async () => {
      const flow = { id: 'flow-1', states: undefined } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);

      await expect(service.getStates('flow-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getCurrentState', () => {
    it('should delegate to innovationFlowStateService', async () => {
      const state = { id: 'state-1', displayName: 'Active' } as any;
      vi.mocked(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).mockResolvedValue(state);

      const result = await service.getCurrentState('state-1');

      expect(result).toBe(state);
      expect(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).toHaveBeenCalledWith('state-1');
    });
  });

  describe('getFlowTagsetTemplate', () => {
    it('should return tagset template when it exists', async () => {
      const template = { id: 'template-1' };
      const flow = { id: 'flow-1', flowStatesTagsetTemplate: template } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);

      const result = await service.getFlowTagsetTemplate({
        id: 'flow-1',
      } as any);

      expect(result).toBe(template);
    });

    it('should throw EntityNotFoundException when flowStatesTagsetTemplate is not initialized', async () => {
      const flow = {
        id: 'flow-1',
        flowStatesTagsetTemplate: undefined,
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);

      await expect(
        service.getFlowTagsetTemplate({ id: 'flow-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('updateInnovationFlow', () => {
    it('should update profile when profileData is provided', async () => {
      const flow = { id: 'flow-1', profile: { id: 'p-1' } } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);
      vi.mocked(profileService.updateProfile).mockResolvedValue({
        id: 'p-1-updated',
      } as any);
      vi.mocked(repository.save).mockResolvedValue(flow);

      await service.updateInnovationFlow({
        innovationFlowID: 'flow-1',
        profileData: { displayName: 'Updated' },
      } as any);

      expect(profileService.updateProfile).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should not update profile when profileData is not provided', async () => {
      const flow = { id: 'flow-1', profile: { id: 'p-1' } } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);
      vi.mocked(repository.save).mockResolvedValue(flow);

      await service.updateInnovationFlow({
        innovationFlowID: 'flow-1',
      } as any);

      expect(profileService.updateProfile).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('updateInnovationFlowState', () => {
    it('should update a state and return it', async () => {
      const states = [
        { id: 's-1', displayName: 'State A', sortOrder: 10 },
        { id: 's-2', displayName: 'State B', sortOrder: 20 },
      ];
      const flow = {
        id: 'flow-1',
        states,
        currentStateID: 's-1',
        flowStatesTagsetTemplate: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(flow);
      const updatedState = {
        id: 's-1',
        displayName: 'State A',
        sortOrder: 10,
      } as any;
      vi.mocked(innovationFlowStateService.update).mockResolvedValue(
        updatedState
      );
      vi.mocked(repository.save).mockResolvedValue(flow);

      const result = await service.updateInnovationFlowState('flow-1', {
        innovationFlowStateID: 's-1',
        displayName: 'State A',
      } as any);

      expect(result).toBe(updatedState);
    });

    it('should throw EntityNotFoundException when state is not found in flow', async () => {
      const flow = {
        id: 'flow-1',
        states: [{ id: 's-1', displayName: 'State A', sortOrder: 10 }],
        currentStateID: 's-1',
        flowStatesTagsetTemplate: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(flow);

      await expect(
        service.updateInnovationFlowState('flow-1', {
          innovationFlowStateID: 'nonexistent',
          displayName: 'New Name',
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should update tagset template when state is renamed and template exists', async () => {
      const tagsets = [{ id: 'ts-1' }];
      const flowStatesTagsetTemplate = { id: 'tst-1', tagsets };
      const states = [
        { id: 's-1', displayName: 'Old Name', sortOrder: 10 },
        { id: 's-2', displayName: 'State B', sortOrder: 20 },
      ];
      const flow = {
        id: 'flow-1',
        states,
        currentStateID: 's-1',
        flowStatesTagsetTemplate,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(flow);
      vi.mocked(innovationFlowStateService.update).mockResolvedValue({
        id: 's-1',
        displayName: 'New Name',
        sortOrder: 10,
      } as any);
      vi.mocked(repository.save).mockResolvedValue(flow);

      await service.updateInnovationFlowState('flow-1', {
        innovationFlowStateID: 's-1',
        displayName: 'New Name',
      } as any);

      expect(
        tagsetTemplateService.updateTagsetTemplateDefinition
      ).toHaveBeenCalled();
      expect(tagsetService.updateTagsetsSelectedValue).toHaveBeenCalled();
    });
  });

  describe('updateCurrentState', () => {
    it('should update the current state when the state is part of the flow', async () => {
      const states = [
        { id: 's-1', displayName: 'A' },
        { id: 's-2', displayName: 'B' },
      ];
      const flow = {
        id: 'flow-1',
        states,
        currentStateID: 's-1',
        profile: {},
        flowStatesTagsetTemplate: {},
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(flow);
      vi.mocked(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).mockResolvedValue({ id: 's-2', displayName: 'B' } as any);
      vi.mocked(repository.save).mockResolvedValue(flow);

      const result = await service.updateCurrentState({
        innovationFlowID: 'flow-1',
        currentStateID: 's-2',
      } as any);

      expect(result.currentStateID).toBe('s-2');
    });

    it('should throw ValidationException when state is not part of the flow', async () => {
      const states = [{ id: 's-1', displayName: 'A' }];
      const flow = {
        id: 'flow-1',
        states,
        currentStateID: 's-1',
        profile: {},
        flowStatesTagsetTemplate: {},
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(flow);
      vi.mocked(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).mockResolvedValue({
        id: 'alien-state',
        displayName: 'Alien',
      } as any);

      await expect(
        service.updateCurrentState({
          innovationFlowID: 'flow-1',
          currentStateID: 'alien-state',
        } as any)
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('createStateOnInnovationFlow', () => {
    it('should create a new state on the innovation flow', async () => {
      const flow = {
        id: 'flow-1',
        states: [{ id: 's-1', sortOrder: 5 }],
        settings: { maximumNumberOfStates: 10 },
      } as any;

      const newState = { id: 's-new', sortOrder: 6 } as any;
      vi.mocked(
        innovationFlowStateService.createInnovationFlowState
      ).mockResolvedValue(newState);
      vi.mocked(innovationFlowStateService.save).mockResolvedValue(newState);

      const result = await service.createStateOnInnovationFlow(flow, {
        displayName: 'New State',
      } as any);

      expect(result).toBe(newState);
      expect(newState.innovationFlow).toBe(flow);
    });

    it('should throw RelationshipNotFoundException when states are not loaded', async () => {
      const flow = {
        id: 'flow-1',
        states: undefined,
        settings: { maximumNumberOfStates: 10 },
      } as any;

      await expect(
        service.createStateOnInnovationFlow(flow, {
          displayName: 'X',
        } as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw ValidationException when maximum number of states is reached', async () => {
      const flow = {
        id: 'flow-1',
        states: [
          { id: 's-1', sortOrder: 1 },
          { id: 's-2', sortOrder: 2 },
        ],
        settings: { maximumNumberOfStates: 2 },
      } as any;

      await expect(
        service.createStateOnInnovationFlow(flow, {
          displayName: 'X',
        } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('should auto-assign sortOrder when not provided', async () => {
      const flow = {
        id: 'flow-1',
        states: [
          { id: 's-1', sortOrder: 5 },
          { id: 's-2', sortOrder: 10 },
        ],
        settings: { maximumNumberOfStates: 10 },
      } as any;

      const stateData = { displayName: 'New' } as any;
      const newState = { id: 's-new' } as any;
      vi.mocked(
        innovationFlowStateService.createInnovationFlowState
      ).mockResolvedValue(newState);
      vi.mocked(innovationFlowStateService.save).mockResolvedValue(newState);

      await service.createStateOnInnovationFlow(flow, stateData);

      // sortOrder should be max(5, 10) + 1 = 11
      expect(stateData.sortOrder).toBe(11);
    });

    it('should set sortOrder to 1 when no existing states', async () => {
      const flow = {
        id: 'flow-1',
        states: [],
        settings: { maximumNumberOfStates: 10 },
      } as any;

      const stateData = { displayName: 'First' } as any;
      const newState = { id: 's-new' } as any;
      vi.mocked(
        innovationFlowStateService.createInnovationFlowState
      ).mockResolvedValue(newState);
      vi.mocked(innovationFlowStateService.save).mockResolvedValue(newState);

      await service.createStateOnInnovationFlow(flow, stateData);

      expect(stateData.sortOrder).toBe(1);
    });
  });

  describe('deleteStateOnInnovationFlow', () => {
    it('should throw RelationshipNotFoundException when states are not loaded', async () => {
      const flow = {
        id: 'flow-1',
        states: undefined,
        settings: { minimumNumberOfStates: 1 },
      } as any;

      await expect(
        service.deleteStateOnInnovationFlow(flow, { ID: 's-1' } as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw ValidationException when at minimum number of states', async () => {
      const flow = {
        id: 'flow-1',
        states: [{ id: 's-1' }],
        settings: { minimumNumberOfStates: 1 },
      } as any;

      await expect(
        service.deleteStateOnInnovationFlow(flow, { ID: 's-1' } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw EntityNotInitializedException when state ID is not found', async () => {
      const flow = {
        id: 'flow-1',
        states: [{ id: 's-1' }, { id: 's-2' }],
        settings: { minimumNumberOfStates: 1 },
      } as any;

      await expect(
        service.deleteStateOnInnovationFlow(flow, {
          ID: 'nonexistent',
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('deleteInnovationFlow', () => {
    it('should delete profile, states, and the flow itself', async () => {
      const flow = {
        id: 'flow-1',
        profile: { id: 'p-1' },
        states: [{ id: 's-1' }, { id: 's-2' }],
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(flow);
      vi.mocked(repository.remove).mockResolvedValue({ id: undefined } as any);

      const result = await service.deleteInnovationFlow('flow-1');

      expect(profileService.deleteProfile).toHaveBeenCalledWith('p-1');
      expect(innovationFlowStateService.delete).toHaveBeenCalledTimes(2);
      expect(repository.remove).toHaveBeenCalled();
      expect(result.id).toBe('flow-1');
    });

    it('should throw RelationshipNotFoundException when profile or states are missing', async () => {
      const flow = {
        id: 'flow-1',
        profile: undefined,
        states: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(flow);

      await expect(service.deleteInnovationFlow('flow-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('updateStatesSortOrder', () => {
    it('should reorder states based on provided IDs', async () => {
      const states = [
        { id: 's-1', sortOrder: 10 },
        { id: 's-2', sortOrder: 20 },
        { id: 's-3', sortOrder: 30 },
      ];
      const flow = { id: 'flow-1', states } as any;

      vi.mocked(repository.findOne).mockResolvedValue(flow);
      vi.mocked(innovationFlowStateService.saveAll).mockResolvedValue(
        undefined as any
      );

      const result = await service.updateStatesSortOrder('flow-1', {
        stateIDs: ['s-3', 's-1', 's-2'],
      } as any);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('s-3');
      expect(result[1].id).toBe('s-1');
      expect(result[2].id).toBe('s-2');
    });

    it('should throw EntityNotInitializedException when states are missing', async () => {
      const flow = { id: 'flow-1', states: undefined } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);

      await expect(
        service.updateStatesSortOrder('flow-1', {
          stateIDs: ['s-1'],
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotFoundException when a state ID is not found', async () => {
      const flow = {
        id: 'flow-1',
        states: [{ id: 's-1', sortOrder: 10 }],
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);

      await expect(
        service.updateStatesSortOrder('flow-1', {
          stateIDs: ['s-1', 'nonexistent'],
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('createInnovationFlow', () => {
    it('should throw ValidationException when states array is empty', async () => {
      await expect(
        service.createInnovationFlow(
          { states: [], settings: {} } as any,
          {} as any,
          {} as any
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should create an innovation flow with states and set currentStateID', async () => {
      const stateCreated1 = { id: 's-1', displayName: 'A', sortOrder: 5 };
      const stateCreated2 = { id: 's-2', displayName: 'B', sortOrder: 10 };

      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'p-1',
      } as any);
      vi.mocked(profileService.addVisualsOnProfile).mockResolvedValue(
        undefined as any
      );
      vi.mocked(innovationFlowStateService.createInnovationFlowState)
        .mockResolvedValueOnce(stateCreated1 as any)
        .mockResolvedValueOnce(stateCreated2 as any);
      vi.mocked(repository.save).mockImplementation(async (entity: any) => {
        return entity;
      });

      const flowData = {
        states: [
          { displayName: 'A', sortOrder: 5 },
          { displayName: 'B', sortOrder: 10 },
        ],
        settings: { maximumNumberOfStates: 10, minimumNumberOfStates: 1 },
        profile: { displayName: 'Test Flow', visuals: [] },
      } as any;

      const result = await service.createInnovationFlow(
        flowData,
        {} as any,
        {} as any
      );

      expect(result.states).toHaveLength(2);
      expect(result.currentStateID).toBe('s-1');
    });

    it('should set currentStateID based on currentStateDisplayName when provided', async () => {
      const stateCreated1 = { id: 's-1', displayName: 'A', sortOrder: 5 };
      const stateCreated2 = { id: 's-2', displayName: 'B', sortOrder: 10 };

      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'p-1',
      } as any);
      vi.mocked(profileService.addVisualsOnProfile).mockResolvedValue(
        undefined as any
      );
      vi.mocked(innovationFlowStateService.createInnovationFlowState)
        .mockResolvedValueOnce(stateCreated1 as any)
        .mockResolvedValueOnce(stateCreated2 as any);
      vi.mocked(repository.save).mockImplementation(async (entity: any) => {
        return entity;
      });

      const flowData = {
        states: [
          { displayName: 'A', sortOrder: 5 },
          { displayName: 'B', sortOrder: 10 },
        ],
        settings: { maximumNumberOfStates: 10, minimumNumberOfStates: 1 },
        profile: { displayName: 'Test Flow', visuals: [] },
        currentStateDisplayName: 'B',
      } as any;

      const result = await service.createInnovationFlow(
        flowData,
        {} as any,
        {} as any
      );

      expect(result.currentStateID).toBe('s-2');
    });
  });

  describe('updateInnovationFlowStates', () => {
    it('should replace all states and update tagset template', async () => {
      const existingStates = [
        { id: 's-old-1', displayName: 'Old A', sortOrder: 10 },
      ];
      const flow = {
        id: 'flow-1',
        states: existingStates,
        currentStateID: 's-old-1',
      } as any;

      vi.mocked(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).mockResolvedValue({
        id: 's-old-1',
        displayName: 'Old A',
      } as any);
      vi.mocked(innovationFlowStateService.delete).mockResolvedValue({} as any);

      const newState1 = {
        id: 's-new-1',
        displayName: 'New A',
        sortOrder: 5,
      } as any;
      const newState2 = {
        id: 's-new-2',
        displayName: 'New B',
        sortOrder: 10,
      } as any;
      vi.mocked(innovationFlowStateService.createInnovationFlowState)
        .mockResolvedValueOnce(newState1)
        .mockResolvedValueOnce(newState2);

      vi.mocked(repository.save).mockImplementation(async (entity: any) => {
        return entity;
      });

      // For the updateFlowStatesTagsetTemplate call
      const flowWithTagsets = {
        id: 'flow-1',
        flowStatesTagsetTemplate: { id: 'tst-1', tagsets: [{ id: 'ts-1' }] },
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flowWithTagsets);

      await service.updateInnovationFlowStates(flow, [
        { displayName: 'New A', sortOrder: 5 },
        { displayName: 'New B', sortOrder: 10 },
      ] as any);

      expect(innovationFlowStateService.delete).toHaveBeenCalledTimes(1);
      expect(
        innovationFlowStateService.createInnovationFlowState
      ).toHaveBeenCalledTimes(2);
      expect(
        tagsetTemplateService.updateTagsetTemplateDefinition
      ).toHaveBeenCalled();
      expect(tagsetService.updateTagsetsSelectedValue).toHaveBeenCalled();
    });
  });
});
