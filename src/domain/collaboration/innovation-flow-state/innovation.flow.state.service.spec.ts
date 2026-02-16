import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Template } from '@domain/template/template/template.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { InnovationFlowStateService } from './innovation.flow.state.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { vi } from 'vitest';

describe('InnovationFlowStateService', () => {
  let service: InnovationFlowStateService;
  let db: any;

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
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InnovationFlowStateService);
    db = module.get(DRIZZLE);
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

      await service.update(state, {
        displayName: 'Name',
        settings: { allowNewCallouts: false },
      } as any);

      expect(state.settings.allowNewCallouts).toBe(false);
    });

    it('should default description to empty string when undefined', async () => {
      const state = {
        id: 'state-1',
        displayName: 'Name',
        description: 'Old',
        settings: { allowNewCallouts: true },
      } as any;

      await service.update(state, {
        displayName: 'Name',
        description: undefined,
      } as any);

      expect(state.description).toBe('');
    });
  });

  describe('delete', () => {
    it('should remove state and preserve original ID', async () => {
      const state = { id: 'state-1' } as InnovationFlowState;

      const result = await service.delete(state);

      expect(result.id).toBe('state-1');
    });
  });

  describe('getInnovationFlowStateOrFail', () => {
    it('should return state when found', async () => {
      const state = { id: 'state-1' } as InnovationFlowState;
      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(state);

      const result = await service.getInnovationFlowStateOrFail('state-1');

      expect(result).toBe(state);
    });

    it('should throw EntityNotFoundException when state is not found', async () => {
      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(undefined);

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
      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(flowState);

      const result = await service.getDefaultCalloutTemplate('state-1');

      expect(result).toBe(template);
    });

    it('should return null when flow state has no default callout template', async () => {
      const flowState = {
        id: 'state-1',
        defaultCalloutTemplate: undefined,
      };
      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(flowState);

      const result = await service.getDefaultCalloutTemplate('state-1');

      expect(result).toBeNull();
    });

    it('should return null when flow state is not found', async () => {
      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(undefined);

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

      // First call: getInnovationFlowStateOrFail
      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(flowState);
      // templates.findFirst for template lookup
      db.query.templates.findFirst.mockResolvedValueOnce(template);
      // Second call: getInnovationFlowStateOrFail at end
      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(flowState);

      const result = await service.setDefaultCalloutTemplate(
        'state-1',
        'template-1'
      );

      expect(result).toBe(flowState);
    });

    it('should throw EntityNotFoundException when template is not found', async () => {
      const flowState = { id: 'state-1' } as InnovationFlowState;

      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(flowState);
      db.query.templates.findFirst.mockResolvedValueOnce(undefined);

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

      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(flowState);
      db.query.templates.findFirst.mockResolvedValueOnce(template);

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

      // getInnovationFlowStateOrFail at the end
      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(flowState);

      const result = await service.removeDefaultCalloutTemplate('state-1');

      expect(result).toBe(flowState);
    });

    it('should throw EntityNotFoundException when flow state is not found', async () => {
      db.query.innovationFlowStates.findFirst.mockResolvedValueOnce(undefined);

      await expect(
        service.removeDefaultCalloutTemplate('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
