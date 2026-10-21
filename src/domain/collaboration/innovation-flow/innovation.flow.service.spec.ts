import { SidebarWidget } from '@common/enums/sidebar.widget';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { TagsetTemplateService } from '@domain/common/tagset-template/tagset.template.service';
import { Space } from '@domain/space/space/space.entity';
import { TemplateContentSpace } from '@domain/template/template-content-space/template.content.space.entity';
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
  let authorizationPolicyService: AuthorizationPolicyService;
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
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    repository = module.get(getRepositoryToken(InnovationFlow));
    profileService = module.get(ProfileService);
    tagsetService = module.get(TagsetService);
    tagsetTemplateService = module.get(TagsetTemplateService);
    innovationFlowStateService = module.get(InnovationFlowStateService);
    _calloutsSetService = module.get(CalloutsSetService);
  });

  // Stubs the owner lookups behind the flow-level resolver: the owning Space (if any) and,
  // failing that, the owning TemplateContentSpace (if any). `undefined` = no owner of that kind.
  const mockFlowOwners = (owners: {
    spaceLevel?: number;
    templateLevel?: number;
  }) => {
    const spaceFindOne = vi
      .fn()
      .mockResolvedValue(
        owners.spaceLevel === undefined
          ? null
          : { id: 'space-1', level: owners.spaceLevel }
      );
    const templateFindOne = vi
      .fn()
      .mockResolvedValue(
        owners.templateLevel === undefined
          ? null
          : { id: 'tcs-1', level: owners.templateLevel }
      );
    (repository as any).manager = {
      getRepository: vi.fn((entity: unknown) => {
        if (entity === Space) return { findOne: spaceFindOne };
        if (entity === TemplateContentSpace)
          return { findOne: templateFindOne };
        // the collaboration lookup of the delete path: no callouts set to move
        return {
          findOne: vi.fn().mockResolvedValue({ id: 'collab-1' }),
        };
      }),
    };
    return { spaceFindOne, templateFindOne };
  };

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

  // Uniqueness was enforced only when a flow was CREATED, so the incremental edit paths
  // (rename, add state) could produce a flow that creating it from scratch would reject.
  // Posts join to their phase by display name, so duplicates make that join ambiguous.
  describe('validateStateDisplayNameIsUnique', () => {
    const existingStates = [
      { id: 's-1', displayName: 'Home' },
      { id: 's-2', displayName: 'Community' },
    ] as any[];

    it('should throw when adding a name that already exists', () => {
      expect(() =>
        service.validateStateDisplayNameIsUnique('Home', existingStates)
      ).toThrow(ValidationException);
    });

    it('should throw regardless of casing or surrounding whitespace', () => {
      expect(() =>
        service.validateStateDisplayNameIsUnique('  hOmE ', existingStates)
      ).toThrow(ValidationException);
    });

    it('should allow a state to keep its own name on rename (self-collision excluded)', () => {
      expect(() =>
        service.validateStateDisplayNameIsUnique('Home', existingStates, 's-1')
      ).not.toThrow();
    });

    it('should throw when renaming one state onto another state name', () => {
      expect(() =>
        service.validateStateDisplayNameIsUnique(
          'Community',
          existingStates,
          's-1'
        )
      ).toThrow(ValidationException);
    });

    it('should allow a genuinely new name', () => {
      expect(() =>
        service.validateStateDisplayNameIsUnique('Knowledge', existingStates)
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

  describe('state description materialization', () => {
    it('re-homes each state description into the flow profile bucket and saves changed states', async () => {
      const profile = {
        id: 'flow-profile',
        storageBucket: { id: 'flow-bucket' },
      };
      const changed = { id: 's1', description: '![a](old)' };
      const unchanged = { id: 's2', description: 'plain' };
      const flow = { id: 'flow-1', profile, states: [changed, unchanged] };
      const flowData = {
        profile: { displayName: 'Flow', sourceStorageBucketID: 'tpl-bucket' },
      };
      const profileService = (service as any).profileService;
      profileService.materializeMarkdownIntoProfileBucket = vi.fn(
        async (markdown: string) => markdown.replace('old', 'new')
      );
      const actor = { actorID: 'creator' };

      await (service as any).materializeStateDescriptions(
        flow,
        flowData,
        actor
      );

      expect(
        profileService.materializeMarkdownIntoProfileBucket
      ).toHaveBeenCalledWith('![a](old)', profile, flowData.profile, actor);
      expect(changed.description).toBe('![a](new)');
      expect(innovationFlowStateService.save).toHaveBeenCalledTimes(1);
      expect(innovationFlowStateService.save).toHaveBeenCalledWith(changed);
    });

    it('re-homes the states of an existing flow as the given actor, trusting no source bucket', async () => {
      const profile = {
        id: 'flow-profile',
        storageBucket: { id: 'flow-bucket', documents: [] },
      };
      const state = { id: 's1', description: '![a](old)' };
      vi.mocked(repository.findOne).mockResolvedValue({
        id: 'flow-1',
        profile,
        states: [state],
      } as any);
      const profileService = (service as any).profileService;
      profileService.materializeMarkdownIntoProfileBucket = vi.fn(
        async (markdown: string) => markdown.replace('old', 'new')
      );
      const actor = { actorID: 'saver' } as any;

      await service.copyStateDescriptionFiles('flow-1', actor);

      expect(
        profileService.materializeMarkdownIntoProfileBucket
      ).toHaveBeenCalledWith('![a](old)', profile, undefined, actor);
      expect(innovationFlowStateService.save).toHaveBeenCalledWith(state);
      expect(state.description).toBe('![a](new)');
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

    it('should throw ValidationException when renamed state name contains a comma', async () => {
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

      await expect(
        service.updateInnovationFlowState('flow-1', {
          innovationFlowStateID: 's-1',
          displayName: 'State,A',
        } as any)
      ).rejects.toThrow(ValidationException);
      // Must reject before the state is ever updated/persisted
      expect(innovationFlowStateService.update).not.toHaveBeenCalled();
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

    it('should normalize the returned state so a row missing sidebar carries the generic default', async () => {
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
      // Simulate a row whose settings never carried a sidebar key.
      const updatedState = {
        id: 's-1',
        displayName: 'State A',
        sortOrder: 10,
        settings: { allowNewCallouts: true },
      } as any;
      vi.mocked(innovationFlowStateService.update).mockResolvedValue(
        updatedState
      );
      vi.mocked(repository.save).mockResolvedValue(flow);

      const result = await service.updateInnovationFlowState('flow-1', {
        innovationFlowStateID: 's-1',
        displayName: 'State A',
      } as any);

      expect(result.settings.sidebar).toEqual([
        'intent',
        'createPost',
        'applicationButton',
        'search',
        'index',
      ]);
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

    it('should throw ValidationException when the new state name contains a comma', async () => {
      const flow = {
        id: 'flow-1',
        states: [{ id: 's-1', sortOrder: 5 }],
        settings: { maximumNumberOfStates: 10 },
      } as any;

      await expect(
        service.createStateOnInnovationFlow(flow, {
          displayName: 'New,State',
        } as any)
      ).rejects.toThrow(ValidationException);
      // Must reject before the state is ever created/persisted
      expect(
        innovationFlowStateService.createInnovationFlowState
      ).not.toHaveBeenCalled();
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

    it('should delete the authorization policy', async () => {
      const flow = {
        id: 'flow-1',
        profile: { id: 'p-1' },
        states: [{ id: 's-1' }],
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(flow);
      vi.mocked(repository.remove).mockResolvedValue({ id: undefined } as any);

      await service.deleteInnovationFlow('flow-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        flow.authorization
      );
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
    beforeEach(() => {
      mockFlowOwners({ spaceLevel: 0 });
    });

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

  describe('positional sidebars on subspace flows', () => {
    const A = 'a1000000-0000-4000-8000-000000000001';
    const B = 'b2000000-0000-4000-8000-000000000002';
    const C = 'c3000000-0000-4000-8000-000000000003';
    const la = [SidebarWidget.INTENT, 'zzz' as SidebarWidget];
    const lb = [SidebarWidget.ABOUT];
    const lc = [SidebarWidget.EVENTS];

    const buildFlow = () => ({
      id: 'flow-1',
      settings: { minimumNumberOfStates: 1, maximumNumberOfStates: 8 },
      states: [
        {
          id: A,
          sortOrder: 10,
          settings: { visible: true, allowNewCallouts: true, sidebar: [...la] },
        },
        {
          id: B,
          sortOrder: 20,
          settings: {
            visible: false,
            allowNewCallouts: true,
            sidebar: [...lb],
          },
        },
        {
          id: C,
          sortOrder: 30,
          settings: { visible: true, allowNewCallouts: true, sidebar: [...lc] },
        },
      ],
    });

    const savedStates = () =>
      vi.mocked(innovationFlowStateService.saveAll).mock.calls[0][0] as any[];
    const byRank = (states: any[]) =>
      [...states].sort(
        (x, y) => x.sortOrder - y.sortOrder || (x.id < y.id ? -1 : 1)
      );

    const reorder = async (flow: any, stateIDs: string[]) => {
      vi.mocked(repository.findOne).mockResolvedValue(flow);
      vi.mocked(innovationFlowStateService.saveAll).mockResolvedValue(
        undefined as any
      );
      return service.updateStatesSortOrder('flow-1', { stateIDs } as any);
    };

    describe('resolveInnovationFlowLevel', () => {
      const resolve = (flowId: string) =>
        (service as any).resolveInnovationFlowLevel(flowId);

      it.each([
        [{ spaceLevel: 1 }, 1],
        [{ spaceLevel: 0 }, 0],
        [{ templateLevel: 2 }, 2],
        [{ templateLevel: 0 }, 0],
        [{}, undefined],
      ])('owners %j resolve to level %s', async (owners, expected) => {
        mockFlowOwners(owners);
        await expect(resolve('flow-1')).resolves.toBe(expected);
      });

      it('prefers the owning Space and never looks at templates then', async () => {
        const { templateFindOne } = mockFlowOwners({
          spaceLevel: 2,
          templateLevel: 0,
        });
        await expect(resolve('flow-1')).resolves.toBe(2);
        expect(templateFindOne).not.toHaveBeenCalled();
      });
    });

    describe('updateStatesSortOrder', () => {
      it('L1: lists stay by position, visibility stays with its state, every state is returned', async () => {
        mockFlowOwners({ spaceLevel: 1 });
        const result = await reorder(buildFlow(), [C, A, B]);

        const ranked = byRank(savedStates());
        expect(ranked.map(s => s.id)).toEqual([C, A, B]);
        expect(ranked.map(s => s.settings.sidebar)).toEqual([la, lb, lc]);
        expect(ranked.find(s => s.id === B).settings.visible).toBe(false);
        expect(ranked.find(s => s.id === C).settings.visible).toBe(true);

        expect(result.map(s => s.id)).toEqual([C, A, B]);
        // the response is normalized: the unknown value is filtered there only
        expect(result[0].settings.sidebar).toEqual([SidebarWidget.INTENT]);
      });

      it('L1: the raw unknown value moves verbatim in what is saved', async () => {
        mockFlowOwners({ spaceLevel: 1 });
        await reorder(buildFlow(), [C, A, B]);
        expect(byRank(savedStates())[0].settings.sidebar).toEqual([
          SidebarWidget.INTENT,
          'zzz',
        ]);
      });

      it('L0 control: lists travel with their states', async () => {
        mockFlowOwners({ spaceLevel: 0 });
        const result = await reorder(buildFlow(), [C, A, B]);
        const saved = savedStates();
        expect(saved.find(s => s.id === C).settings.sidebar).toEqual(lc);
        expect(saved.find(s => s.id === A).settings.sidebar).toEqual(la);
        expect(result.map(s => s.id)).toEqual([C, A, B]);
        expect(result[0].settings.sidebar).toEqual(lc);
      });

      it('L1 template flow is positional; L0 template flow is not; orphan is not', async () => {
        mockFlowOwners({ templateLevel: 1 });
        await reorder(buildFlow(), [C, A, B]);
        expect(byRank(savedStates())[0].settings.sidebar).toEqual(la);

        vi.mocked(innovationFlowStateService.saveAll).mockClear();
        mockFlowOwners({ templateLevel: 0 });
        await reorder(buildFlow(), [C, A, B]);
        expect(byRank(savedStates())[0].settings.sidebar).toEqual(lc);

        vi.mocked(innovationFlowStateService.saveAll).mockClear();
        mockFlowOwners({});
        await reorder(buildFlow(), [C, A, B]);
        expect(byRank(savedStates())[0].settings.sidebar).toEqual(lc);
      });

      it('partial id list: ranks are computed over the whole flow', async () => {
        mockFlowOwners({ spaceLevel: 1 });
        // C gets 20, A gets 30 (min of [30, 10] + 10 steps); B keeps 20 and ties with C
        const result = await reorder(buildFlow(), [C, A]);
        const ranked = byRank(savedStates());
        expect(savedStates()).toHaveLength(3);
        expect(ranked.map(s => s.id)).toEqual([B, C, A]);
        expect(ranked.map(s => s.settings.sidebar)).toEqual([la, lb, lc]);
        expect(result).toHaveLength(3);
      });

      it('an absent list stays absent at its position', async () => {
        mockFlowOwners({ spaceLevel: 2 });
        const flow = buildFlow();
        delete (flow.states[0].settings as any).sidebar;
        await reorder(flow, [C, A, B]);
        const ranked = byRank(savedStates());
        expect('sidebar' in ranked[0].settings).toBe(false);
        expect(ranked[0].id).toBe(C);
        expect(ranked[0].settings.visible).toBe(true);
        expect(ranked[1].settings.sidebar).toEqual(lb);
      });

      it('identity order leaves every saved list unchanged', async () => {
        mockFlowOwners({ spaceLevel: 1 });
        await reorder(buildFlow(), [A, B, C]);
        expect(byRank(savedStates()).map(s => s.settings.sidebar)).toEqual([
          la,
          lb,
          lc,
        ]);
      });
    });

    describe('deleteStateOnInnovationFlow', () => {
      beforeEach(() => {
        vi.mocked(
          innovationFlowStateService.deleteWithSidebarInheritance
        ).mockResolvedValue({ id: 'removed' } as any);
        vi.mocked(
          innovationFlowStateService.getInnovationFlowStateOrFail
        ).mockResolvedValue({ id: 'loaded' } as any);
        vi.mocked(innovationFlowStateService.delete).mockResolvedValue({
          id: 'removed',
        } as any);
      });

      it('L1 first state: the new first state inherits its list', async () => {
        mockFlowOwners({ spaceLevel: 1 });
        const result = await service.deleteStateOnInnovationFlow(
          buildFlow() as any,
          { ID: A } as any
        );
        expect(
          innovationFlowStateService.deleteWithSidebarInheritance
        ).toHaveBeenCalledWith(A, B, undefined);
        expect(innovationFlowStateService.delete).not.toHaveBeenCalled();
        expect(result.id).toBe(A);
      });

      it('L1 first state is ranked by (sortOrder, id), never array order', async () => {
        mockFlowOwners({ spaceLevel: 1 });
        const flow = buildFlow();
        flow.states.reverse();
        flow.states.forEach(state => {
          state.sortOrder = 5;
        });
        await service.deleteStateOnInnovationFlow(
          flow as any,
          { ID: A } as any
        );
        expect(
          innovationFlowStateService.deleteWithSidebarInheritance
        ).toHaveBeenCalledWith(A, B, undefined);
      });

      it('L1 non-first state: plain delete, no inheritance', async () => {
        mockFlowOwners({ spaceLevel: 1 });
        await service.deleteStateOnInnovationFlow(
          buildFlow() as any,
          { ID: B } as any
        );
        expect(
          innovationFlowStateService.deleteWithSidebarInheritance
        ).not.toHaveBeenCalled();
        expect(innovationFlowStateService.delete).toHaveBeenCalled();
      });

      it('L0 first state: plain delete, no inheritance', async () => {
        mockFlowOwners({ spaceLevel: 0 });
        await service.deleteStateOnInnovationFlow(
          buildFlow() as any,
          { ID: A } as any
        );
        expect(
          innovationFlowStateService.deleteWithSidebarInheritance
        ).not.toHaveBeenCalled();
        expect(innovationFlowStateService.delete).toHaveBeenCalled();
      });

      describe('callouts on the deleted state', () => {
        const calloutOn = (stateName: string) => ({
          id: 'callout-1',
          classification: {
            tagsets: [
              { name: TagsetReservedName.FLOW_STATE, tags: [stateName] },
            ],
          },
        });
        const calloutsSet = { id: 'cs-1', callouts: [calloutOn('Alpha')] };

        const buildNamedFlow = () => {
          const flow = buildFlow() as any;
          ['Alpha', 'Beta', 'Gamma'].forEach((name, index) => {
            flow.states[index].displayName = name;
          });
          return flow;
        };

        const mockCalloutsSet = (spaceLevel: number) => {
          mockFlowOwners({ spaceLevel });
          const getRepository = (repository as any).manager.getRepository;
          (repository as any).manager.getRepository = vi.fn(
            (entity: unknown) =>
              entity === Space || entity === TemplateContentSpace
                ? getRepository(entity)
                : {
                    findOne: vi.fn().mockResolvedValue({
                      id: 'collab-1',
                      calloutsSet: { id: 'cs-1' },
                    }),
                  }
          );
          vi.mocked(_calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
            calloutsSet as any
          );
          vi.mocked(_calloutsSetService.save).mockResolvedValue(
            calloutsSet as any
          );
        };

        it('L1 first state: the callout move is saved inside the delete transaction', async () => {
          mockCalloutsSet(1);
          await service.deleteStateOnInnovationFlow(buildNamedFlow(), {
            ID: A,
          } as any);

          expect(
            _calloutsSetService.moveCalloutsToDefaultFlowState
          ).toHaveBeenCalledWith(['Beta', 'Gamma'], [calloutsSet.callouts[0]]);
          // nothing persisted before the transaction
          expect(_calloutsSetService.save).not.toHaveBeenCalled();
          const persistAlongside = vi.mocked(
            innovationFlowStateService.deleteWithSidebarInheritance
          ).mock.calls[0][2];
          expect(persistAlongside).toBeTypeOf('function');

          const entityManager = { marker: 'tx' } as any;
          await persistAlongside?.(entityManager);
          expect(_calloutsSetService.save).toHaveBeenCalledWith(
            calloutsSet,
            entityManager
          );
        });

        it('L1 first state: a failing callout save inside the transaction surfaces as the move failure', async () => {
          mockCalloutsSet(1);
          vi.mocked(_calloutsSetService.save).mockRejectedValue(
            new Error('callouts write failed')
          );
          await service.deleteStateOnInnovationFlow(buildNamedFlow(), {
            ID: A,
          } as any);
          const persistAlongside = vi.mocked(
            innovationFlowStateService.deleteWithSidebarInheritance
          ).mock.calls[0][2];

          await expect(persistAlongside?.({} as any)).rejects.toThrow(
            ValidationException
          );
        });

        it('L1 non-first state: the callout move is saved before the plain delete', async () => {
          mockCalloutsSet(1);
          const flow = buildNamedFlow();
          calloutsSet.callouts = [calloutOn('Beta')];
          await service.deleteStateOnInnovationFlow(flow, { ID: B } as any);
          calloutsSet.callouts = [calloutOn('Alpha')];

          expect(_calloutsSetService.save).toHaveBeenCalledWith(calloutsSet);
          expect(
            innovationFlowStateService.deleteWithSidebarInheritance
          ).not.toHaveBeenCalled();
          expect(innovationFlowStateService.delete).toHaveBeenCalled();
        });
      });

      it('L2 template first state inherits; orphan first state does not', async () => {
        mockFlowOwners({ templateLevel: 2 });
        await service.deleteStateOnInnovationFlow(
          buildFlow() as any,
          { ID: A } as any
        );
        expect(
          innovationFlowStateService.deleteWithSidebarInheritance
        ).toHaveBeenCalledTimes(1);

        mockFlowOwners({});
        await service.deleteStateOnInnovationFlow(
          buildFlow() as any,
          { ID: A } as any
        );
        expect(
          innovationFlowStateService.deleteWithSidebarInheritance
        ).toHaveBeenCalledTimes(1);
        expect(innovationFlowStateService.delete).toHaveBeenCalledTimes(1);
      });
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

    it('should throw ValidationException when a new state name contains a comma', async () => {
      const flow = {
        id: 'flow-1',
        states: [{ id: 's-old-1', displayName: 'Old A', sortOrder: 10 }],
        currentStateID: 's-old-1',
      } as any;

      await expect(
        service.updateInnovationFlowStates(flow, [
          { displayName: 'New A', sortOrder: 5 },
          { displayName: 'New,B', sortOrder: 10 },
        ] as any)
      ).rejects.toThrow(ValidationException);
      // Must reject before any existing state is deleted or rebuilt
      expect(innovationFlowStateService.delete).not.toHaveBeenCalled();
      expect(
        innovationFlowStateService.createInnovationFlowState
      ).not.toHaveBeenCalled();
    });
  });

  // Story #6177 made the add/delete guards settings-driven; client-web#9528
  // aligned both L0 spaces and subspaces to min 1 / max 8. The guards read the
  // per-flow `settings`, so these assert the mechanism with the current bounds
  // — and that a stricter stored minimum would still be enforced (the
  // machinery is kept for a future re-tightening).
  describe('state count bounds', () => {
    const bounds1To8 = { minimumNumberOfStates: 1, maximumNumberOfStates: 8 };

    it('should add a 5th state to a flow that has 4 states', async () => {
      const flow = {
        id: 'flow-l0',
        states: [
          { id: 's-1', sortOrder: 1 },
          { id: 's-2', sortOrder: 2 },
          { id: 's-3', sortOrder: 3 },
          { id: 's-4', sortOrder: 4 },
        ],
        settings: bounds1To8,
      } as any;

      const newState = { id: 's-5' } as any;
      vi.mocked(
        innovationFlowStateService.createInnovationFlowState
      ).mockResolvedValue(newState);
      vi.mocked(innovationFlowStateService.save).mockResolvedValue(newState);

      const stateData = { displayName: 'Fifth' } as any;
      const result = await service.createStateOnInnovationFlow(flow, stateData);

      expect(result).toBe(newState);
      // sortOrder should be max(1..4) + 1 = 5 (appended last)
      expect(stateData.sortOrder).toBe(5);
    });

    it('should reject adding a 9th state when a flow is at the max of 8', async () => {
      const flow = {
        id: 'flow-l0',
        states: Array.from({ length: 8 }, (_v, i) => ({
          id: `s-${i + 1}`,
          sortOrder: i + 1,
        })),
        settings: bounds1To8,
      } as any;

      await expect(
        service.createStateOnInnovationFlow(flow, {
          displayName: 'Ninth',
        } as any)
      ).rejects.toThrow(ValidationException);
      expect(
        innovationFlowStateService.createInnovationFlowState
      ).not.toHaveBeenCalled();
    });

    it('should reject deleting the last remaining state (minimum of 1)', async () => {
      const flow = {
        id: 'flow-l0',
        states: [{ id: 's-1' }],
        settings: bounds1To8,
      } as any;

      await expect(
        service.deleteStateOnInnovationFlow(flow, { ID: 's-1' } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('mechanism kept: a flow whose stored settings carry a stricter minimum is still guarded', async () => {
      // Legacy-shaped settings (the pre-#9528 L0 floor). The delete guard reads
      // the per-flow settings, so restoring stricter bounds needs no code change.
      const flow = {
        id: 'flow-legacy',
        states: [{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }, { id: 's-4' }],
        settings: { minimumNumberOfStates: 4, maximumNumberOfStates: 8 },
      } as any;

      await expect(
        service.deleteStateOnInnovationFlow(flow, { ID: 's-4' } as any)
      ).rejects.toThrow(ValidationException);
    });
  });

  // client-web#9528: L0 spaces no longer have fixed phases
  // (L0_FIXED_INNOVATION_FLOW_STATES = 0), so applying a template to an L0
  // space is a wholesale replacement — the same net behavior as subspaces —
  // and a template may carry as few as 1 state.
  describe('updateInnovationFlowStatesFromTemplate (client-web#9528)', () => {
    const bounds1To8 = { minimumNumberOfStates: 1, maximumNumberOfStates: 8 };

    // Helper: stub the owning-space level lookup used by isLevelZeroInnovationFlow.
    const mockOwningSpaceLevel = (level: number | undefined) => {
      (repository as any).manager = {
        getRepository: vi.fn().mockReturnValue({
          findOne: vi
            .fn()
            .mockResolvedValue(
              level === undefined ? null : { id: 'space-1', level }
            ),
        }),
      };
    };

    const targetL0States = [
      {
        id: 's-1',
        displayName: 'Define',
        description: 'd1',
        settings: { allowNewCallouts: true, sidebar: [SidebarWidget.INDEX] },
        sortOrder: 1,
      },
      {
        id: 's-2',
        displayName: 'Discover',
        description: 'd2',
        settings: { allowNewCallouts: true, sidebar: [SidebarWidget.INDEX] },
        sortOrder: 2,
      },
      {
        id: 's-3',
        displayName: 'Develop',
        description: 'd3',
        settings: { allowNewCallouts: true, sidebar: [SidebarWidget.INDEX] },
        sortOrder: 3,
      },
      {
        id: 's-4',
        displayName: 'Deliver',
        description: 'd4',
        settings: { allowNewCallouts: true, sidebar: [SidebarWidget.INDEX] },
        sortOrder: 4,
      },
    ];

    it('L0: replaces all states with the template states — no fixed-phase preservation, template sidebars carried verbatim', async () => {
      mockOwningSpaceLevel(0); // L0
      const flow = {
        id: 'flow-l0',
        states: targetL0States,
        settings: bounds1To8,
      } as any;

      const updateSpy = vi
        .spyOn(service, 'updateInnovationFlowStates')
        .mockResolvedValue(flow);

      // A subspace-shaped template: only 2 states, fewer than the old L0 floor.
      const templateStates = [
        {
          displayName: 'New A',
          sortOrder: 7,
          settings: {
            allowNewCallouts: true,
            sidebar: [SidebarWidget.EVENTS],
          },
        },
        {
          displayName: 'New B',
          sortOrder: 9,
          settings: {
            allowNewCallouts: true,
            sidebar: [SidebarWidget.GUIDELINES],
          },
        },
      ] as any;

      await service.updateInnovationFlowStatesFromTemplate(
        flow,
        templateStates
      );

      expect(updateSpy).toHaveBeenCalledTimes(1);
      const combined: any[] = updateSpy.mock.calls[0][1];
      // Exactly the template states — none of the target's own states survive.
      expect(combined.map(s => s.displayName)).toEqual(['New A', 'New B']);
      // Sort order is rebased to a clean leading sequence.
      expect(combined.map(s => s.sortOrder)).toEqual([1, 2]);
      // Template sidebars are carried through untouched.
      expect(combined.map(s => s.settings.sidebar)).toEqual([
        [SidebarWidget.EVENTS],
        [SidebarWidget.GUIDELINES],
      ]);
    });

    it('L0: rejects atomically when the template exceeds the flow maximum', async () => {
      mockOwningSpaceLevel(0); // L0
      const flow = {
        id: 'flow-l0',
        states: targetL0States,
        settings: bounds1To8,
      } as any;

      const updateSpy = vi
        .spyOn(service, 'updateInnovationFlowStates')
        .mockResolvedValue(flow);

      // 9 template states > max 8 → must reject before any mutation.
      const templateStates = Array.from({ length: 9 }, (_v, i) => ({
        displayName: `State ${i + 1}`,
        sortOrder: i + 1,
      })) as any;

      await expect(
        service.updateInnovationFlowStatesFromTemplate(flow, templateStates)
      ).rejects.toThrow(ValidationException);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('subspaces fall through to a wholesale replacement, template states passed through untouched', async () => {
      mockOwningSpaceLevel(1); // L1 subspace
      const flow = {
        id: 'flow-l1',
        states: [{ id: 's-1', displayName: 'Old', sortOrder: 1 }],
        settings: bounds1To8,
      } as any;

      const updateSpy = vi
        .spyOn(service, 'updateInnovationFlowStates')
        .mockResolvedValue(flow);

      const templateStates = [
        { displayName: 'New A', sortOrder: 1 },
        { displayName: 'New B', sortOrder: 2 },
      ] as any;

      await service.updateInnovationFlowStatesFromTemplate(
        flow,
        templateStates
      );

      // Subspace path passes the template states through untouched.
      expect(updateSpy).toHaveBeenCalledWith(flow, templateStates);
    });
  });
});
