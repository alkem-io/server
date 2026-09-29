import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import {
  InvitationLifecycleService,
  invitationLifecycleMachine,
} from './invitation.service.lifecycle';

describe('InvitationLifecycleService', () => {
  let service: InvitationLifecycleService;
  let lifecycleService: LifecycleService;

  beforeEach(async () => {
    vi.restoreAllMocks();

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

  describe('the real machine: a declined invitation cannot be resurrected', () => {
    // Regression (FR-004/R2). `rejected` used to carry
    // `REINVITE -> invited` guarded on `hasUpdatePrivilege` — a privilege the
    // INVITING Space admin holds through the RoleSet's inherited
    // authorization. `eventOnInvitation` re-runs neither
    // `guardOrganizationInvitation` (the organization's
    // `allowSpaceInvitations` opt-out and the Lead-slot limit) nor the
    // invitation notification, so that transition let the very party the
    // opt-out protects against loop a declining organization back to
    // `invited`, silently and indefinitely. Re-inviting now goes through
    // ARCHIVE (final) + a fresh `inviteForEntryRoleOnRoleSet`, where every
    // one of those checks runs.
    const realService = () =>
      new InvitationLifecycleService(
        new LifecycleService({} as any, MockWinstonProvider.useValue as any)
      );

    const rejectedLifecycle = {
      id: 'lc-rejected',
      machineState: JSON.stringify({
        status: 'active',
        value: 'rejected',
        historyValue: {},
        context: {},
        children: {},
      }),
    } as any;

    it('offers ARCHIVE and nothing else from `rejected`', () => {
      expect(realService().getNextEvents(rejectedLifecycle)).toEqual([
        'ARCHIVE',
      ]);
    });

    it('declares no transition out of `rejected` that returns to `invited`', () => {
      // Asserted on the definition as well as the runtime, because the
      // states-only machine and the primary event-handling machine are kept
      // in sync by hand (see the comment in the service).
      const rejectedTransitions =
        (invitationLifecycleMachine.states as any).rejected.on ?? {};
      expect(Object.keys(rejectedTransitions)).toEqual(['ARCHIVE']);
      expect(
        Object.values(rejectedTransitions).map((t: any) => t.target)
      ).not.toContain('invited');
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
