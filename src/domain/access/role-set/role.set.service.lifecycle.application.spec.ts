import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { RoleSetServiceLifecycleApplication } from './role.set.service.lifecycle.application';

describe('RoleSetServiceLifecycleApplication', () => {
  let service: RoleSetServiceLifecycleApplication;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetServiceLifecycleApplication,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<RoleSetServiceLifecycleApplication>(
      RoleSetServiceLifecycleApplication
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getApplicationMachine', () => {
    it('should return a state machine', () => {
      const machine = service.getApplicationMachine();

      expect(machine).toBeDefined();
    });

    it('should return the same machine instance on subsequent calls', () => {
      const machine1 = service.getApplicationMachine();
      const machine2 = service.getApplicationMachine();

      expect(machine1).toBe(machine2);
    });
  });
});
