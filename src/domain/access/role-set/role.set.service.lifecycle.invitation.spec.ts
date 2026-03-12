import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { RoleSetServiceLifecycleInvitation } from './role.set.service.lifecycle.invitation';

describe('RoleSetServiceLifecycleInvitation', () => {
  let service: RoleSetServiceLifecycleInvitation;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetServiceLifecycleInvitation,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<RoleSetServiceLifecycleInvitation>(
      RoleSetServiceLifecycleInvitation
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInvitationMachine', () => {
    it('should return a state machine', () => {
      const machine = service.getInvitationMachine();

      expect(machine).toBeDefined();
    });

    it('should return the same machine instance on subsequent calls', () => {
      const machine1 = service.getInvitationMachine();
      const machine2 = service.getInvitationMachine();

      expect(machine1).toBe(machine2);
    });
  });
});
