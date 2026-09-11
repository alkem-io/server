import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { SidebarWidget } from '@common/enums/sidebar.widget';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Template } from '@domain/template/template/template.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { InnovationFlowStateService } from './innovation.flow.state.service';

describe('InnovationFlowStateService', () => {
  let service: InnovationFlowStateService;
  let repository: Repository<InnovationFlowState>;
  let templateRepository: Repository<Template>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Mock static InnovationFlowState.create to avoid DataSource requirement
    vi.spyOn(InnovationFlowState, 'create').mockImplementation((input: any) => {
      const entity = new InnovationFlowState();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationFlowStateService,
        repositoryProviderMockFactory(InnovationFlowState),
        repositoryProviderMockFactory(Template),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InnovationFlowStateService);
    repository = module.get(getRepositoryToken(InnovationFlowState));
    templateRepository = module.get(getRepositoryToken(Template));
  });

  describe('createInnovationFlowState', () => {
    it('should create state with displayName, default settings, and sortOrder', async () => {
      const stateData = {
        displayName: 'In Progress',
        description: 'Work in progress',
        sortOrder: 2,
      };

      const result = await service.createInnovationFlowState(stateData);

      expect(result.displayName).toBe('In Progress');
      expect(result.description).toBe('Work in progress');
      expect(result.sortOrder).toBe(2);
      expect(result.settings.allowNewCallouts).toBe(true);
      expect(result.authorization).toBeDefined();
    });

    it('should default settings.visible to true when not provided (FR-005)', async () => {
      const stateData = {
        displayName: 'Draft',
      };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.settings.visible).toBe(true);
    });

    it('should honor an explicit create-time visible=false (FR-005)', async () => {
      const stateData = {
        displayName: 'Hidden Draft',
        settings: { allowNewCallouts: true, visible: false },
      };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.settings.visible).toBe(false);
      // allowNewCallouts default behaviour is unchanged (out of scope)
      expect(result.settings.allowNewCallouts).toBe(true);
    });

    it('should default description to empty string when not provided', async () => {
      const stateData = {
        displayName: 'Draft',
      };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.description).toBe('');
    });

    it('should default sortOrder to 0 when not provided', async () => {
      const stateData = {
        displayName: 'Draft',
      };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.sortOrder).toBe(0);
    });

    // FR-001/021: descriptionDisplayMode defaults
    it('should default settings.descriptionDisplayMode to EXPANDED when not provided (FR-001)', async () => {
      const stateData = { displayName: 'Draft' };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.EXPANDED
      );
    });

    it('should honor an explicit create-time descriptionDisplayMode=COLLAPSED (FR-001)', async () => {
      const stateData = {
        displayName: 'Dense Phase',
        settings: {
          allowNewCallouts: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
        },
      };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.COLLAPSED
      );
    });

    // FR-002/021: showPublishDetails defaults
    it('should default settings.showPublishDetails to true when not provided (FR-002)', async () => {
      const stateData = { displayName: 'Draft' };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.settings.showPublishDetails).toBe(true);
    });

    it('should honor an explicit create-time showPublishDetails=false (FR-002)', async () => {
      const stateData = {
        displayName: 'Content Block',
        settings: { allowNewCallouts: true, showPublishDetails: false },
      };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.settings.showPublishDetails).toBe(false);
    });

    it('should default settings.sidebar to [INTENT, CREATE_POST, APPLICATION_BUTTON, SEARCH, INDEX] when not provided', async () => {
      const stateData = { displayName: 'Draft' };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.settings.sidebar).toEqual([
        SidebarWidget.INTENT,
        SidebarWidget.CREATE_POST,
        SidebarWidget.APPLICATION_BUTTON,
        SidebarWidget.SEARCH,
        SidebarWidget.INDEX,
      ]);
    });

    it('should honor an explicit create-time sidebar list verbatim, content and order (template save/apply leg)', async () => {
      const stateData = {
        displayName: 'Home',
        settings: {
          allowNewCallouts: true,
          sidebar: [
            SidebarWidget.EVENTS,
            SidebarWidget.INTENT,
            SidebarWidget.ABOUT,
          ],
        },
      };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.settings.sidebar).toEqual([
        SidebarWidget.EVENTS,
        SidebarWidget.INTENT,
        SidebarWidget.ABOUT,
      ]);
    });

    it('should honor an explicit empty create-time sidebar list', async () => {
      const stateData = {
        displayName: 'Empty Sidebar',
        settings: { allowNewCallouts: true, sidebar: [] },
      };

      const result = await service.createInnovationFlowState(stateData as any);

      expect(result.settings.sidebar).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update displayName and description', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Old Name',
        description: 'Old Desc',
        settings: { allowNewCallouts: true },
      } as any;

      vi.mocked(repository.save).mockResolvedValue({
        ...state,
        displayName: 'New Name',
        description: 'New Desc',
      } as any);

      const _result = await service.update(state, {
        displayName: 'New Name',
        description: 'New Desc',
      } as any);

      expect(state.displayName).toBe('New Name');
      expect(state.description).toBe('New Desc');
    });

    it('should update settings when provided', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: { allowNewCallouts: true },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { allowNewCallouts: false },
      } as any);

      expect(state.settings.allowNewCallouts).toBe(false);
    });

    it('should set settings.visible to false when explicitly provided (FR-002)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: { allowNewCallouts: true, visible: true },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { allowNewCallouts: true, visible: false },
      } as any);

      expect(state.settings.visible).toBe(false);
    });

    it('should set settings.visible to true when explicitly provided (FR-002)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: { allowNewCallouts: true, visible: false },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { allowNewCallouts: true, visible: true },
      } as any);

      expect(state.settings.visible).toBe(true);
    });

    it('should preserve stored settings.visible when omitted from the update (FR-002)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: { allowNewCallouts: true, visible: false },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { allowNewCallouts: true },
      } as any);

      // omission is a no-op: the previously stored value is retained
      expect(state.settings.visible).toBe(false);
    });

    it('should preserve every stored settings field when sent as explicit null (never overwrite a NonNull field)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: false,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
          showPublishDetails: false,
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      // A nullable GraphQL input can arrive as explicit null; the `!= null` guard must
      // treat it like omission and keep the stored values (so the mutation's own NonNull
      // response never fails to serialize).
      await service.update(state, {
        displayName: 'Name',
        settings: {
          allowNewCallouts: null,
          descriptionDisplayMode: null,
          showPublishDetails: null,
          visible: null,
        },
      } as any);

      expect(state.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.COLLAPSED
      );
      expect(state.settings.showPublishDetails).toBe(false);
      expect(state.settings.visible).toBe(true);
      // allowNewCallouts is Boolean! on the output type: an explicit null must never be
      // persisted, or every subsequent read of this state fails NonNull serialization.
      expect(state.settings.allowNewCallouts).toBe(false);
    });

    it('should preserve stored settings.allowNewCallouts when omitted from the update', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: { allowNewCallouts: true, visible: true },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { visible: false },
      } as any);

      // omission is a no-op: the previously stored value is retained
      expect(state.settings.allowNewCallouts).toBe(true);
      expect(state.settings.visible).toBe(false);
    });

    it('should not alter allowNewCallouts when only visible changes (FR-009)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: { allowNewCallouts: true, visible: true },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { allowNewCallouts: true, visible: false },
      } as any);

      expect(state.settings.allowNewCallouts).toBe(true);
      expect(state.settings.visible).toBe(false);
    });

    // FR-013: displayName/description are partial updates too. A client editing only
    // `settings` omits them, and omission must preserve — previously `description ?? ''`
    // wiped the stored description whenever it was not re-sent.
    it('should preserve the stored description when omitted from the update (FR-013)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: 'Old',
        settings: { allowNewCallouts: true },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        description: undefined,
      } as any);

      expect(state.description).toBe('Old');
    });

    it('should clear the description when an explicit empty string is sent', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: 'Old',
        settings: { allowNewCallouts: true },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        description: '',
      } as any);

      expect(state.description).toBe('');
    });

    it('should preserve the stored displayName when omitted from the update (FR-013)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Original',
        description: 'Desc',
        settings: { allowNewCallouts: true },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      // A settings-only edit must not clobber a concurrent rename it never saw.
      await service.update(state, {
        settings: { showPublishDetails: false },
      } as any);

      expect(state.displayName).toBe('Original');
      expect(state.description).toBe('Desc');
      expect(state.settings.showPublishDetails).toBe(false);
    });

    // FR-001/021: descriptionDisplayMode partial update
    it('should update descriptionDisplayMode to COLLAPSED when explicitly set (FR-001)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: true,
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: {
          descriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
        },
      } as any);

      expect(state.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.COLLAPSED
      );
    });

    it('should preserve stored descriptionDisplayMode when omitted from the update (FR-013)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
          showPublishDetails: true,
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { visible: true },
      } as any);

      expect(state.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.COLLAPSED
      );
    });

    // FR-002/021: showPublishDetails partial update
    it('should update showPublishDetails to false when explicitly set (FR-002)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: true,
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { showPublishDetails: false },
      } as any);

      expect(state.settings.showPublishDetails).toBe(false);
    });

    it('should preserve stored showPublishDetails when omitted from the update (FR-013)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: false,
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { visible: true },
      } as any);

      expect(state.settings.showPublishDetails).toBe(false);
    });

    it('should not alter descriptionDisplayMode when only showPublishDetails changes (FR-013)', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
          showPublishDetails: true,
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { showPublishDetails: false },
      } as any);

      expect(state.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.COLLAPSED
      );
      expect(state.settings.showPublishDetails).toBe(false);
    });

    it('should replace sidebar wholesale when an explicit list is sent', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: true,
          sidebar: [SidebarWidget.INTENT, SidebarWidget.INDEX],
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { sidebar: [SidebarWidget.EVENTS, SidebarWidget.INTENT] },
      } as any);

      expect(state.settings.sidebar).toEqual([
        SidebarWidget.EVENTS,
        SidebarWidget.INTENT,
      ]);
    });

    it('should preserve stored sidebar when omitted from the update', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: true,
          sidebar: [SidebarWidget.INTENT, SidebarWidget.INDEX],
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { visible: false },
      } as any);

      expect(state.settings.sidebar).toEqual([
        SidebarWidget.INTENT,
        SidebarWidget.INDEX,
      ]);
      expect(state.settings.visible).toBe(false);
    });

    it('should preserve stored sidebar when the update sends an explicit null', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: true,
          sidebar: [SidebarWidget.INTENT, SidebarWidget.INDEX],
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { sidebar: null },
      } as any);

      expect(state.settings.sidebar).toEqual([
        SidebarWidget.INTENT,
        SidebarWidget.INDEX,
      ]);
    });

    it('should store an explicit empty sidebar list', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: true,
          sidebar: [SidebarWidget.INTENT, SidebarWidget.INDEX],
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { sidebar: [] },
      } as any);

      expect(state.settings.sidebar).toEqual([]);
    });

    it('should leave visible/descriptionDisplayMode/showPublishDetails untouched on a sidebar-only save', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: '',
        settings: {
          allowNewCallouts: true,
          visible: false,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
          showPublishDetails: false,
          sidebar: [SidebarWidget.INTENT],
        },
      } as any;

      vi.mocked(repository.save).mockResolvedValue(state);

      await service.update(state, {
        displayName: 'Name',
        settings: { sidebar: [SidebarWidget.EVENTS] },
      } as any);

      expect(state.settings.sidebar).toEqual([SidebarWidget.EVENTS]);
      expect(state.settings.visible).toBe(false);
      expect(state.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.COLLAPSED
      );
      expect(state.settings.showPublishDetails).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove state and preserve original ID', async () => {
      const state = { id: 'state-1' } as InnovationFlowState;
      vi.mocked(repository.remove).mockResolvedValue({
        id: undefined,
      } as any);

      const result = await service.delete(state);

      expect(repository.remove).toHaveBeenCalledWith(state);
      expect(result.id).toBe('state-1');
    });
  });

  describe('getInnovationFlowStateOrFail', () => {
    it('should return state when found', async () => {
      const state = { id: 'state-1' } as InnovationFlowState;
      vi.mocked(repository.findOne).mockResolvedValue(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result).toBe(state);
    });

    it('should throw EntityNotFoundException when state is not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      await expect(
        service.getInnovationFlowStateOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should coerce a missing settings.visible to true on read (FR-001)', async () => {
      const state = {
        id: 'state-1',
        settings: { allowNewCallouts: true },
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result.settings.visible).toBe(true);
    });

    it('should not overwrite an existing settings.visible=false on read (FR-001)', async () => {
      const state = {
        id: 'state-1',
        settings: { allowNewCallouts: true, visible: false },
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result.settings.visible).toBe(false);
    });

    it('should initialize settings with visible=true when settings is entirely absent on read (FR-001)', async () => {
      const state = {
        id: 'state-1',
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result.settings.visible).toBe(true);
      expect(result.settings.allowNewCallouts).toBe(true);
    });

    // FR-001/021: descriptionDisplayMode coercion
    it('should coerce absent descriptionDisplayMode to EXPANDED on read (FR-001)', async () => {
      const state = {
        id: 'state-1',
        settings: { allowNewCallouts: true, visible: true },
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.EXPANDED
      );
    });

    it('should not overwrite an existing descriptionDisplayMode=COLLAPSED on read (FR-001)', async () => {
      const state = {
        id: 'state-1',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
        },
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.COLLAPSED
      );
    });

    // FR-002/021: showPublishDetails coercion
    it('should coerce absent showPublishDetails to true on read (FR-002)', async () => {
      const state = {
        id: 'state-1',
        settings: { allowNewCallouts: true, visible: true },
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result.settings.showPublishDetails).toBe(true);
    });

    it('should not overwrite an existing showPublishDetails=false on read (FR-002)', async () => {
      const state = {
        id: 'state-1',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: false,
        },
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result.settings.showPublishDetails).toBe(false);
    });

    it('should initialize settings with all defaults when settings is entirely absent on read (FR-001/FR-002)', async () => {
      const state = { id: 'state-1' } as any;
      vi.mocked(repository.findOne).mockResolvedValue(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result.settings.descriptionDisplayMode).toBe(
        CalloutDescriptionDisplayMode.EXPANDED
      );
      expect(result.settings.showPublishDetails).toBe(true);
    });
  });

  describe('getStateNames', () => {
    it('should return array of display names from states', () => {
      const states = [
        { displayName: 'Draft' },
        { displayName: 'In Progress' },
        { displayName: 'Done' },
      ] as any[];

      const result = service.getStateNames(states);

      expect(result).toEqual(['Draft', 'In Progress', 'Done']);
    });

    it('should return empty array for empty states', () => {
      const result = service.getStateNames([]);

      expect(result).toEqual([]);
    });
  });

  describe('getDefaultCalloutTemplate', () => {
    it('should return template when flow state has a default callout template', async () => {
      const template = { id: 'template-1', type: TemplateType.CALLOUT };
      const flowState = {
        id: 'state-1',
        defaultCalloutTemplate: template,
      };

      vi.mocked(repository.findOne).mockResolvedValue(flowState as any);

      const result = await service.getDefaultCalloutTemplate('state-1');

      expect(result).toBe(template);
    });

    it('should return null when flow state has no default callout template', async () => {
      const flowState = {
        id: 'state-1',
        defaultCalloutTemplate: undefined,
      };

      vi.mocked(repository.findOne).mockResolvedValue(flowState as any);

      const result = await service.getDefaultCalloutTemplate('state-1');

      expect(result).toBeNull();
    });

    it('should return null when flow state is not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      const result = await service.getDefaultCalloutTemplate('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('setDefaultCalloutTemplate', () => {
    it('should set a CALLOUT template as default for flow state', async () => {
      const flowState = { id: 'state-1' } as InnovationFlowState;
      const template = {
        id: 'template-1',
        type: TemplateType.CALLOUT,
      } as Template;

      vi.mocked(repository.findOne).mockResolvedValue(flowState);
      vi.mocked(templateRepository.find).mockResolvedValue([template]);
      vi.mocked(repository.save).mockResolvedValue(flowState);

      const result = await service.setDefaultCalloutTemplate(
        'state-1',
        'template-1'
      );

      // The service returns a normalized DETACHED copy (so read-path settings
      // normalization never persists); identity with the raw entity is not expected.
      expect(result.id).toBe('state-1');
      expect((result as InnovationFlowState).defaultCalloutTemplate).toBe(
        template
      );
      expect((flowState as InnovationFlowState).defaultCalloutTemplate).toBe(
        template
      );
      expect(repository.save).toHaveBeenCalledWith(flowState);
    });

    it('does not persist read-path sidebar normalization (rolling-deploy safety)', async () => {
      // A widget slug this node's enum does not know — e.g. written by a NEWER release
      // during a rolling deploy. The unrelated set-default-template save must not strip it.
      const storedSidebar = [
        SidebarWidget.INTENT,
        'widgetFromANewerRelease',
        SidebarWidget.INDEX,
      ];
      const flowState = {
        id: 'state-1',
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: true,
          sidebar: [...storedSidebar],
        },
      } as any;
      const template = {
        id: 'template-1',
        type: TemplateType.CALLOUT,
      } as Template;

      vi.mocked(repository.findOne).mockResolvedValue(flowState);
      vi.mocked(templateRepository.find).mockResolvedValue([template]);
      vi.mocked(repository.save).mockImplementation(async e => e as any);

      const result = await service.setDefaultCalloutTemplate(
        'state-1',
        'template-1'
      );

      // Persisted entity keeps the stored list verbatim — the unknown value survives.
      const savedEntity = vi.mocked(repository.save).mock.calls[0][0] as any;
      expect(savedEntity.settings.sidebar).toEqual(storedSidebar);
      expect(flowState.settings.sidebar).toEqual(storedSidebar);
      // The API-visible response is still filtered to the known vocabulary.
      expect(result.settings.sidebar).toEqual([
        SidebarWidget.INTENT,
        SidebarWidget.INDEX,
      ]);
    });

    it('should throw EntityNotFoundException when template is not found', async () => {
      const flowState = { id: 'state-1' } as InnovationFlowState;

      vi.mocked(repository.findOne).mockResolvedValue(flowState);
      vi.mocked(templateRepository.find).mockResolvedValue([]);

      await expect(
        service.setDefaultCalloutTemplate('state-1', 'nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ValidationException when template is not of type CALLOUT', async () => {
      const flowState = { id: 'state-1' } as InnovationFlowState;
      const template = {
        id: 'template-1',
        type: TemplateType.WHITEBOARD,
      } as Template;

      vi.mocked(repository.findOne).mockResolvedValue(flowState);
      vi.mocked(templateRepository.find).mockResolvedValue([template]);

      await expect(
        service.setDefaultCalloutTemplate('state-1', 'template-1')
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('removeDefaultCalloutTemplate', () => {
    it('should set defaultCalloutTemplate to null', async () => {
      const flowState = {
        id: 'state-1',
        defaultCalloutTemplate: { id: 'template-1' },
      } as InnovationFlowState;

      vi.mocked(repository.findOne).mockResolvedValue(flowState);
      vi.mocked(repository.save).mockResolvedValue(flowState);

      const result = await service.removeDefaultCalloutTemplate('state-1');

      // The service returns a normalized DETACHED copy (so read-path settings
      // normalization never persists); identity with the raw entity is not expected.
      expect(result.id).toBe('state-1');
      expect((result as InnovationFlowState).defaultCalloutTemplate).toBeNull();
      expect(flowState.defaultCalloutTemplate).toBeNull();
      expect(repository.save).toHaveBeenCalledWith(flowState);
    });

    it('does not persist read-path sidebar normalization (rolling-deploy safety)', async () => {
      const storedSidebar = [
        SidebarWidget.INTENT,
        'widgetFromANewerRelease',
        SidebarWidget.INDEX,
      ];
      const flowState = {
        id: 'state-1',
        defaultCalloutTemplate: { id: 'template-1' },
        settings: {
          allowNewCallouts: true,
          visible: true,
          descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
          showPublishDetails: true,
          sidebar: [...storedSidebar],
        },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(flowState);
      vi.mocked(repository.save).mockImplementation(async e => e as any);

      const result = await service.removeDefaultCalloutTemplate('state-1');

      // Persisted entity keeps the stored list verbatim — the unknown value survives.
      const savedEntity = vi.mocked(repository.save).mock.calls[0][0] as any;
      expect(savedEntity.settings.sidebar).toEqual(storedSidebar);
      expect(flowState.settings.sidebar).toEqual(storedSidebar);
      // The API-visible response is still filtered to the known vocabulary.
      expect(result.settings.sidebar).toEqual([
        SidebarWidget.INTENT,
        SidebarWidget.INDEX,
      ]);
    });

    it('should throw EntityNotFoundException when flow state is not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      await expect(
        service.removeDefaultCalloutTemplate('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
