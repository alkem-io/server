import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import {
  contentFullAccessActor,
  orgAdminActor,
  orgChildPolicy,
  realAuthorizationService,
  spaceRoleSetPolicy,
  supportActor,
} from '@test/utils/org.community.policy.fixture';
import { createActor } from 'xstate';
import { OrgCommunityGateService } from './org.community.gate.service';
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

  describe('guards — organization applications', () => {
    // The real gate over the real AuthorizationService, driving the machine
    // itself, so a guard that stops honouring a path shows up as a state that
    // does not move.
    const lifecycle = new RoleSetServiceLifecycleApplication(
      new OrgCommunityGateService(realAuthorizationService()),
      MockWinstonProvider.useValue as any
    );

    const stateAfter = (
      eventType: 'APPROVE' | 'REJECT',
      actorContext: unknown,
      authorization: unknown
    ) => {
      const actor = createActor(lifecycle.getApplicationMachine()).start();
      actor.send({ type: eventType, actorContext, authorization } as any);
      const value = actor.getSnapshot().value;
      actor.stop();
      return value;
    };

    it.each([
      ['the organization admin', orgAdminActor()],
      ['Platform Support', supportActor()],
    ])('let %s approve and reject', (_label, actorContext) => {
      expect(stateAfter('APPROVE', actorContext, orgChildPolicy())).toBe(
        'approving'
      );
      expect(stateAfter('REJECT', actorContext, orgChildPolicy())).toBe(
        'rejected'
      );
    });

    it('block Content Full Access, and Support on a Space application', () => {
      expect(
        stateAfter('APPROVE', contentFullAccessActor(), orgChildPolicy())
      ).toBe('new');
      expect(
        stateAfter('REJECT', contentFullAccessActor(), orgChildPolicy())
      ).toBe('new');
      expect(stateAfter('APPROVE', supportActor(), spaceRoleSetPolicy())).toBe(
        'new'
      );
    });
  });
});
