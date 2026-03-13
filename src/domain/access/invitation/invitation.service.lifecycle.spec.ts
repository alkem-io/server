import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { InvitationLifecycleService } from './invitation.service.lifecycle';

describe('InvitationLifecycleService', () => {
  let service: InvitationLifecycleService;
  let lifecycleService: LifecycleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationLifecycleService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InvitationLifecycleService>(
      InvitationLifecycleService
    );
    lifecycleService = module.get<LifecycleService>(LifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getState', () => {
    it('should delegate to lifecycleService.getState', () => {
      const mockLifecycle = { id: 'lc-1', machineState: 'invited' } as any;
      (lifecycleService.getState as Mock).mockReturnValue('invited');

      const result = service.getState(mockLifecycle);

      expect(result).toBe('invited');
      expect(lifecycleService.getState).toHaveBeenCalledWith(
        mockLifecycle,
        expect.anything()
      );
    });
  });

  describe('getNextEvents', () => {
    it('should delegate to lifecycleService.getNextEvents', () => {
      const mockLifecycle = { id: 'lc-1', machineState: 'invited' } as any;
      (lifecycleService.getNextEvents as Mock).mockReturnValue([
        'ACCEPT',
        'REJECT',
      ]);

      const result = service.getNextEvents(mockLifecycle);

      expect(result).toEqual(['ACCEPT', 'REJECT']);
    });
  });

  describe('isFinalState', () => {
    it('should return true when lifecycle is in final state', () => {
      const mockLifecycle = { id: 'lc-1', machineState: 'accepted' } as any;
      (lifecycleService.isFinalState as Mock).mockReturnValue(true);

      expect(service.isFinalState(mockLifecycle)).toBe(true);
    });

    it('should return false when lifecycle is not in final state', () => {
      const mockLifecycle = { id: 'lc-1', machineState: 'invited' } as any;
      (lifecycleService.isFinalState as Mock).mockReturnValue(false);

      expect(service.isFinalState(mockLifecycle)).toBe(false);
    });
  });
});
