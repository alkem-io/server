import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { ApplicationLifecycleResolverFields } from './application.resolver.fields.lifecycle';
import { ApplicationLifecycleService } from './application.service.lifecycle';

describe('ApplicationLifecycleResolverFields', () => {
  let resolver: ApplicationLifecycleResolverFields;
  let applicationLifecycleService: ApplicationLifecycleService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationLifecycleResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<ApplicationLifecycleResolverFields>(
      ApplicationLifecycleResolverFields
    );
    applicationLifecycleService = module.get<ApplicationLifecycleService>(
      ApplicationLifecycleService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('state', () => {
    it('should return lifecycle state', () => {
      const mockApplication = {
        lifecycle: { id: 'lc-1', machineState: 'new' },
      } as any;
      (applicationLifecycleService.getState as Mock).mockReturnValue('new');

      const result = resolver.state(mockApplication);

      expect(result).toBe('new');
    });
  });

  describe('nextEvents', () => {
    it('should return next lifecycle events', () => {
      const mockApplication = {
        lifecycle: { id: 'lc-1', machineState: 'new' },
      } as any;
      (applicationLifecycleService.getNextEvents as Mock).mockReturnValue([
        'APPROVE',
        'REJECT',
      ]);

      const result = resolver.nextEvents(mockApplication);

      expect(result).toEqual(['APPROVE', 'REJECT']);
    });
  });

  describe('isFinalized', () => {
    it('should return true when finalized', () => {
      const mockApplication = {
        lifecycle: { id: 'lc-1', machineState: 'approved' },
      } as any;
      (applicationLifecycleService.isFinalState as Mock).mockReturnValue(true);

      expect(resolver.isFinalized(mockApplication)).toBe(true);
    });

    it('should return false when not finalized', () => {
      const mockApplication = {
        lifecycle: { id: 'lc-1', machineState: 'new' },
      } as any;
      (applicationLifecycleService.isFinalState as Mock).mockReturnValue(false);

      expect(resolver.isFinalized(mockApplication)).toBe(false);
    });
  });
});
