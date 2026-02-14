import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Template } from '@domain/template/template/template.entity';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { InnovationFlowStateService } from './innovation.flow.state.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('InnovationFlowStateService', () => {
  let service: InnovationFlowStateService;
  let repository: Repository<InnovationFlowState>;
  let templateRepository: Repository<Template>;

  beforeEach(async () => {
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

      const result = await service.update(state, {
        displayName: 'New Name',
        description: 'New Desc',
      });

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
      });

      expect(state.settings.allowNewCallouts).toBe(false);
    });

    it('should default description to empty string when undefined', async () => {
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
      });

      expect(state.description).toBe('');
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

      expect(result).toBe(flowState);
      expect((flowState as InnovationFlowState).defaultCalloutTemplate).toBe(
        template
      );
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

      expect(result).toBe(flowState);
      expect(flowState.defaultCalloutTemplate).toBeNull();
    });

    it('should throw EntityNotFoundException when flow state is not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      await expect(
        service.removeDefaultCalloutTemplate('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
