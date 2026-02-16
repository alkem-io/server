import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { vi } from 'vitest';
import { Lifecycle } from './lifecycle.entity';
import { LifecycleService } from './lifecycle.service';

describe('LifecycleService', () => {
  let service: LifecycleService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LifecycleService);
    db = module.get(DRIZZLE);
  });

  describe('createLifecycle', () => {
    it('should save and return a new lifecycle entity', async () => {
      const savedLifecycle = { id: 'lifecycle-1' } as Lifecycle;
      db.returning.mockResolvedValueOnce([savedLifecycle]);

      const result = await service.createLifecycle();

      expect(result).toEqual(savedLifecycle);
    });
  });

  describe('deleteLifecycle', () => {
    it('should remove the lifecycle when it exists', async () => {
      const lifecycle = { id: 'lifecycle-1' } as Lifecycle;
      db.query.lifecycles.findFirst.mockResolvedValueOnce(lifecycle);

      const result = await service.deleteLifecycle('lifecycle-1');

      expect(result).toEqual(lifecycle);
    });

    it('should throw EntityNotFoundException when lifecycle does not exist', async () => {

      await expect(service.deleteLifecycle('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getLifecycleOrFail', () => {
    it('should return lifecycle when found', async () => {
      const lifecycle = { id: 'lifecycle-1' } as Lifecycle;
      db.query.lifecycles.findFirst.mockResolvedValueOnce(lifecycle);

      const result = await service.getLifecycleOrFail('lifecycle-1');

      expect(result).toEqual(lifecycle);
    });

    it('should throw EntityNotFoundException when lifecycle not found', async () => {

      await expect(service.getLifecycleOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });

  });

  describe('getState', () => {
    it('should return the current state from the machine snapshot', () => {
      const lifecycle = {
        id: 'lifecycle-1',
        machineState: JSON.stringify({ value: 'active' }),
      } as any;
      const mockMachine = {} as any;

      // We need to mock the xstate createActor to test this properly
      // Since getState relies on xstate internals, we test through the service method
      // by providing a lifecycle with valid machineState
      const getActorSpy = vi
        .spyOn(service as any, 'getActorWithState')
        .mockReturnValue({
          getSnapshot: () => ({ value: 'active' }),
        });

      const result = service.getState(lifecycle, mockMachine);

      expect(result).toBe('active');
      getActorSpy.mockRestore();
    });
  });

  describe('isFinalState', () => {
    it('should return true when actor status is done', () => {
      const lifecycle = { id: 'lifecycle-1' } as any;
      const mockMachine = {} as any;

      vi.spyOn(service as any, 'getActorWithState').mockReturnValue({
        getSnapshot: () => ({ status: 'done' }),
      });

      expect(service.isFinalState(lifecycle, mockMachine)).toBe(true);
    });

    it('should return false when actor status is not done', () => {
      const lifecycle = { id: 'lifecycle-1' } as any;
      const mockMachine = {} as any;

      vi.spyOn(service as any, 'getActorWithState').mockReturnValue({
        getSnapshot: () => ({ status: 'active' }),
      });

      expect(service.isFinalState(lifecycle, mockMachine)).toBe(false);
    });
  });

  describe('getNextEvents', () => {
    it('should return available events from the snapshot', () => {
      const lifecycle = { id: 'lifecycle-1' } as any;
      const mockMachine = {} as any;

      vi.spyOn(service as any, 'getActorWithState').mockReturnValue({
        getSnapshot: () => ({
          _nodes: [
            { ownEvents: ['APPROVE', 'REJECT'] },
            { ownEvents: ['APPROVE'] },
          ],
        }),
      });

      const events = service.getNextEvents(lifecycle, mockMachine);

      expect(events).toContain('APPROVE');
      expect(events).toContain('REJECT');
      // Should deduplicate events
      expect(events.filter(e => e === 'APPROVE')).toHaveLength(1);
    });

    it('should return empty array when snapshot has no nodes', () => {
      const lifecycle = { id: 'lifecycle-1' } as any;
      const mockMachine = {} as any;

      vi.spyOn(service as any, 'getActorWithState').mockReturnValue({
        getSnapshot: () => ({
          _nodes: undefined,
        }),
      });

      const events = service.getNextEvents(lifecycle, mockMachine);

      expect(events).toEqual([]);
    });
  });
});
