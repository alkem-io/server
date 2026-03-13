import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { InvitationLifecycleResolverFields } from './invitation.resolver.fields.lifecycle';
import { InvitationLifecycleService } from './invitation.service.lifecycle';

describe('InvitationLifecycleResolverFields', () => {
  let resolver: InvitationLifecycleResolverFields;
  let invitationLifecycleService: InvitationLifecycleService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationLifecycleResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<InvitationLifecycleResolverFields>(
      InvitationLifecycleResolverFields
    );
    invitationLifecycleService = module.get<InvitationLifecycleService>(
      InvitationLifecycleService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('state', () => {
    it('should return lifecycle state', () => {
      const mockInvitation = {
        lifecycle: { id: 'lc-1', machineState: 'invited' },
      } as any;
      (invitationLifecycleService.getState as Mock).mockReturnValue('invited');

      expect(resolver.state(mockInvitation)).toBe('invited');
    });
  });

  describe('nextEvents', () => {
    it('should return next lifecycle events', () => {
      const mockInvitation = {
        lifecycle: { id: 'lc-1' },
      } as any;
      (invitationLifecycleService.getNextEvents as Mock).mockReturnValue([
        'ACCEPT',
        'REJECT',
      ]);

      expect(resolver.nextEvents(mockInvitation)).toEqual(['ACCEPT', 'REJECT']);
    });
  });

  describe('isFinalized', () => {
    it('should return finalized status', () => {
      const mockInvitation = {
        lifecycle: { id: 'lc-1' },
      } as any;
      (invitationLifecycleService.isFinalState as Mock).mockReturnValue(true);

      expect(resolver.isFinalized(mockInvitation)).toBe(true);
    });
  });
});
