import { SPACE_INVITATION_ACCEPTORS_CHANGED } from '@domain/access/invitation/invitation.space.acceptors.event';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Space } from './space.entity';
import { SpaceInvitationAcceptorsEventHandler } from './space.invitation.acceptors.event.handler';
import { SpaceAuthorizationService } from './space.service.authorization';

describe('SpaceInvitationAcceptorsEventHandler', () => {
  const spaceRepository = { findOneOrFail: vi.fn() };
  const spaceAuthorizationService = { applyAuthorizationPolicy: vi.fn() };
  const authorizationPolicyService = { saveAll: vi.fn() };
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        SpaceInvitationAcceptorsEventHandler,
        { provide: getRepositoryToken(Space), useValue: spaceRepository },
        {
          provide: SpaceAuthorizationService,
          useValue: spaceAuthorizationService,
        },
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
      ],
    }).compile();
    await module.init();
    eventEmitter = module.get(EventEmitter2);
  });

  it('resets and saves the authorization of the Space owning the RoleSet', async () => {
    spaceRepository.findOneOrFail.mockResolvedValue({ id: 'space-1' });
    spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
      { id: 'auth-1' },
    ]);

    await eventEmitter.emitAsync(SPACE_INVITATION_ACCEPTORS_CHANGED, {
      roleSetID: 'rs-1',
    });

    expect(spaceRepository.findOneOrFail).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { community: { roleSet: { id: 'rs-1' } } },
      })
    );
    expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([
      { id: 'auth-1' },
    ]);
  });

  it('propagates a failed reset to the emitter instead of swallowing it', async () => {
    spaceRepository.findOneOrFail.mockResolvedValue({ id: 'space-1' });
    spaceAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
      new Error('reset failed')
    );

    await expect(
      eventEmitter.emitAsync(SPACE_INVITATION_ACCEPTORS_CHANGED, {
        roleSetID: 'rs-1',
      })
    ).rejects.toThrow('reset failed');
    expect(authorizationPolicyService.saveAll).not.toHaveBeenCalled();
  });
});
