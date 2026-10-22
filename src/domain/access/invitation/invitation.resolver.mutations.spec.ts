import { ActorType } from '@common/enums/actor.type';
import { RoleSetType } from '@common/enums/role.set.type';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrgCommunityGateService } from '@domain/access/role-set/org.community.gate.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationAdministrationAuditService } from '@src/platform-admin/organization-administration-audit/organization.administration.audit.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import {
  contentFullAccessActor,
  orgAdminActor,
  orgChildPolicy,
  realAuthorizationService,
  spaceAdminActor,
  spaceRoleSetPolicy,
  supportActor,
} from '@test/utils/org.community.policy.fixture';
import { type Mock } from 'vitest';
import { InvitationResolverMutations } from './invitation.resolver.mutations';
import { InvitationService } from './invitation.service';
import { SPACE_INVITATION_ACCEPTORS_CHANGED } from './invitation.space.acceptors.event';

describe('InvitationResolverMutations', () => {
  let resolver: InvitationResolverMutations;
  let invitationService: InvitationService;
  let actorLookupService: ActorLookupService;
  let eventEmitter: EventEmitter2;
  let audit: { record: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationResolverMutations,
        OrgCommunityGateService,
        { provide: AuthorizationService, useValue: realAuthorizationService() },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<InvitationResolverMutations>(
      InvitationResolverMutations
    );
    invitationService = module.get<InvitationService>(InvitationService);
    actorLookupService = module.get<ActorLookupService>(ActorLookupService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    audit = module.get(OrganizationAdministrationAuditService) as any;
    audit.record.mockResolvedValue(undefined);
    (invitationService.deleteInvitation as Mock).mockImplementation(
      async ({ ID }: { ID: string }) => ({ id: ID })
    );
    (actorLookupService.getActorTypeById as Mock).mockResolvedValue(
      ActorType.USER
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deleteInvitation', () => {
    const orgInvitation = (invitedActorID = 'invitee-1') => ({
      id: 'inv-1',
      invitedActorID,
      authorization: orgChildPolicy(),
      roleSet: { id: 'rs-org', type: RoleSetType.ORGANIZATION },
    });

    it('lets the organization admin revoke, loading the role set, and writes no row', async () => {
      (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
        orgInvitation()
      );

      const result = await resolver.deleteInvitation(orgAdminActor(), {
        ID: 'inv-1',
      });

      expect(result).toEqual({ id: 'inv-1' });
      expect(invitationService.getInvitationOrFail).toHaveBeenCalledWith(
        'inv-1',
        { relations: { roleSet: true } }
      );
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('lets Support revoke an organization invitation and writes one row after the delete', async () => {
      (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
        orgInvitation()
      );
      const support = supportActor('support-1');

      await resolver.deleteInvitation(support, { ID: 'inv-1' });

      expect(invitationService.deleteInvitation).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith({
        actorContext: support,
        roleSetId: 'rs-org',
        action: 'revoke_user_invitation',
        targetUserId: 'invitee-1',
        invitationId: 'inv-1',
      });
      expect(
        (invitationService.deleteInvitation as Mock).mock.invocationCallOrder[0]
      ).toBeLessThan(audit.record.mock.invocationCallOrder[0]);
    });

    it('refuses Support revoking an invitation addressed to themself', async () => {
      (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
        orgInvitation('support-1')
      );

      await expect(
        resolver.deleteInvitation(supportActor('support-1'), { ID: 'inv-1' })
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(invitationService.deleteInvitation).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('refuses Content Full Access, and Support on a Space invitation', async () => {
      (invitationService.getInvitationOrFail as Mock).mockResolvedValueOnce(
        orgInvitation()
      );
      await expect(
        resolver.deleteInvitation(contentFullAccessActor(), { ID: 'inv-1' })
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);

      (invitationService.getInvitationOrFail as Mock).mockResolvedValueOnce({
        id: 'inv-2',
        invitedActorID: 'invitee-1',
        authorization: spaceRoleSetPolicy(),
        roleSet: { id: 'rs-space', type: RoleSetType.SPACE },
      });
      await expect(
        resolver.deleteInvitation(supportActor(), { ID: 'inv-2' })
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(invitationService.deleteInvitation).not.toHaveBeenCalled();
    });

    const deleteSpaceInvitationFor = async (invitedActorType: ActorType) => {
      (invitationService.getInvitationOrFail as Mock).mockResolvedValue({
        id: 'inv-1',
        invitedActorID: 'actor-1',
        authorization: spaceRoleSetPolicy(),
        roleSet: { id: 'role-set-1', type: RoleSetType.SPACE },
      });
      (actorLookupService.getActorTypeById as Mock).mockResolvedValue(
        invitedActorType
      );
      await resolver.deleteInvitation(spaceAdminActor(), {
        ID: 'inv-1',
      });
    };

    it('resets the Space when an organization invitation is deleted', async () => {
      await deleteSpaceInvitationFor(ActorType.ORGANIZATION);

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        SPACE_INVITATION_ACCEPTORS_CHANGED,
        { roleSetID: 'role-set-1' }
      );
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('does not reset the Space when a user invitation is deleted', async () => {
      await deleteSpaceInvitationFor(ActorType.USER);

      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });
});
