import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { ApplicationLifecycleService } from './application.service.lifecycle';

describe('ApplicationLifecycleService', () => {
  let service: ApplicationLifecycleService;
  let lifecycleService: LifecycleService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationLifecycleService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<ApplicationLifecycleService>(
      ApplicationLifecycleService
    );
    lifecycleService = module.get<LifecycleService>(LifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getState', () => {
    it('should delegate to lifecycleService.getState', () => {
      const mockLifecycle = { id: 'lc-1', machineState: 'new' } as any;
      (lifecycleService.getState as Mock).mockReturnValue('new');

      const result = service.getState(mockLifecycle);

      expect(result).toBe('new');
      expect(lifecycleService.getState).toHaveBeenCalledWith(
        mockLifecycle,
        expect.anything()
      );
    });
  });

  describe('getNextEvents', () => {
    it('should delegate to lifecycleService.getNextEvents', () => {
      const mockLifecycle = { id: 'lc-1', machineState: 'new' } as any;
      (lifecycleService.getNextEvents as Mock).mockReturnValue([
        'APPROVE',
        'REJECT',
      ]);

      const result = service.getNextEvents(mockLifecycle);

      expect(result).toEqual(['APPROVE', 'REJECT']);
      expect(lifecycleService.getNextEvents).toHaveBeenCalledWith(
        mockLifecycle,
        expect.anything()
      );
    });
  });

  describe('isFinalState', () => {
    it('should return true when lifecycle is in final state', () => {
      const mockLifecycle = { id: 'lc-1', machineState: 'approved' } as any;
      (lifecycleService.isFinalState as Mock).mockReturnValue(true);

      const result = service.isFinalState(mockLifecycle);

      expect(result).toBe(true);
    });

    it('should return false when lifecycle is not in final state', () => {
      const mockLifecycle = { id: 'lc-1', machineState: 'new' } as any;
      (lifecycleService.isFinalState as Mock).mockReturnValue(false);

      const result = service.isFinalState(mockLifecycle);

      expect(result).toBe(false);
    });
  });
});
