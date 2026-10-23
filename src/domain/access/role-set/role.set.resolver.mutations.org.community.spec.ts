import { ActorType } from '@common/enums/actor.type';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { RoleSetPolicyRoleLimitsException } from '@common/exceptions/role.set.policy.role.limits.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationAdministrationAuditService } from '@src/platform-admin/organization-administration-audit/organization.administration.audit.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import {
  adminAndSupportActor,
  contentFullAccessActor,
  orgAdminActor,
  orgRoleSetPolicy,
  realAuthorizationService,
  spaceAdminActor,
  spaceRoleSetPolicy,
  supportActor,
} from '@test/utils/org.community.policy.fixture';
import { type Mock } from 'vitest';
import {
  OrgCommunityGateService,
  SELF_TARGET_REFUSAL_REASON,
} from './org.community.gate.service';
import { RoleSetResolverMutations } from './role.set.resolver.mutations';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';

/**
 * The organization Community-tab assign/remove gates, evaluated against
 * real-shaped stored policies by the real AuthorizationService. Platform
 * Support may promote, demote and remove existing associates (one audit row
 * each), never add anyone directly and never act on themself; organization
 * admins are unchanged and write no row; Space role sets are unaffected.
 */
describe('RoleSetResolverMutations — organization Community tab', () => {
  let resolver: RoleSetResolverMutations;
  let roleSetService: Record<string, Mock>;
  let audit: { record: Mock };
  let associates: Set<string>;

  const orgRoleSet = () => ({
    id: 'rs-org',
    type: RoleSetType.ORGANIZATION,
    entryRoleName: RoleName.ASSOCIATE,
    authorization: orgRoleSetPolicy(),
  });
  const spaceRoleSet = () => ({
    id: 'rs-space',
    type: RoleSetType.SPACE,
    entryRoleName: RoleName.MEMBER,
    authorization: spaceRoleSetPolicy(),
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetResolverMutations,
        OrgCommunityGateService,
        { provide: AuthorizationService, useValue: realAuthorizationService() },
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(RoleSetResolverMutations);
    roleSetService = module.get(RoleSetService) as any;
    audit = module.get(OrganizationAdministrationAuditService) as any;
    associates = new Set(['associate-1', 'support-associate']);

    roleSetService.getRoleSetOrFail.mockImplementation(async (id: string) =>
      id === 'rs-space' ? spaceRoleSet() : orgRoleSet()
    );
    roleSetService.isInRole.mockImplementation(
      async (actorID: string, _roleSet: unknown, role: RoleName) =>
        (role === RoleName.ASSOCIATE || role === RoleName.MEMBER) &&
        associates.has(actorID)
    );
    roleSetService.assignActorToRole.mockResolvedValue(undefined);
    roleSetService.removeActorFromRole.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);

    (module.get(UserLookupService) as any).getUserByIdOrFail.mockImplementation(
      async (id: string) => ({ id })
    );
    (
      module.get(ActorLookupService) as any
    ).getActorByIdOrFail.mockImplementation(async (id: string) => ({
      id,
      type: ActorType.USER,
    }));
    // The real self-removal extension: GRANT for the user being removed.
    (
      module.get(RoleSetAuthorizationService) as any
    ).extendAuthorizationPolicyForSelfRemoval.mockImplementation(
      (roleSet: { authorization: IAuthorizationPolicy }, userID: string) => ({
        ...roleSet.authorization,
        credentialRules: [
          ...roleSet.authorization.credentialRules,
          {
            name: 'self-removal',
            grantedPrivileges: [AuthorizationPrivilege.GRANT],
            criterias: [
              {
                type: AuthorizationCredential.USER_SELF_MANAGEMENT,
                resourceID: userID,
              },
            ],
            cascade: true,
          },
        ],
      })
    );
  });

  const assign = (
    actor: ActorContext,
    actorID: string,
    role: RoleName,
    roleSetID = 'rs-org'
  ) => resolver.assignRoleToUser(actor, { roleSetID, actorID, role } as any);
  const remove = (
    actor: ActorContext,
    actorID: string,
    role: RoleName,
    roleSetID = 'rs-org'
  ) => resolver.removeRoleFromUser(actor, { roleSetID, actorID, role } as any);

  describe('Platform Support — no direct add', () => {
    it('cannot make a non-member an Associate', async () => {
      await expect(
        assign(supportActor(), 'stranger', RoleName.ASSOCIATE)
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it.each([
      RoleName.ADMIN,
      RoleName.OWNER,
    ])('cannot grant %s to someone who is not yet an Associate', async role => {
      await expect(assign(supportActor(), 'stranger', role)).rejects.toThrow(
        ForbiddenAuthorizationPolicyException
      );
      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('cannot assign the entry role even through the generic assignRole', async () => {
      await expect(
        resolver.assignRole(supportActor(), {
          roleSetID: 'rs-org',
          actorID: 'stranger',
          role: RoleName.ASSOCIATE,
        } as any)
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
    });
  });

  describe('Platform Support — promote and demote existing associates', () => {
    it.each([
      RoleName.ADMIN,
      RoleName.OWNER,
    ])('promotes an existing Associate to %s and writes one assign_role row after the grant', async role => {
      const support = supportActor('support-1');
      await assign(support, 'associate-1', role);

      expect(roleSetService.assignActorToRole).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith({
        actorContext: support,
        roleSetId: 'rs-org',
        action: 'assign_role',
        targetUserId: 'associate-1',
        roles: [role],
      });
      expect(
        roleSetService.assignActorToRole.mock.invocationCallOrder[0]
      ).toBeLessThan(audit.record.mock.invocationCallOrder[0]);
    });

    it('the generic assignRole audits the same way', async () => {
      await resolver.assignRole(supportActor('support-1'), {
        roleSetID: 'rs-org',
        actorID: 'associate-1',
        role: RoleName.ADMIN,
      } as any);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record.mock.calls[0][0].action).toBe('assign_role');
    });

    it.each([
      [RoleName.ADMIN, 'remove_role'],
      [RoleName.OWNER, 'remove_role'],
      [RoleName.ASSOCIATE, 'remove_member'],
    ])('removes %s from another user and writes one %s row', async (role, action) => {
      const support = supportActor('support-1');
      await remove(support, 'associate-1', role);

      expect(roleSetService.removeActorFromRole).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith({
        actorContext: support,
        roleSetId: 'rs-org',
        action,
        targetUserId: 'associate-1',
        roles: [role],
      });
    });

    it('the generic removeRole shares the same gate and audits the same way', async () => {
      const authorizeRemoveUser = vi.spyOn(
        resolver as any,
        'authorizeRemoveUser'
      );
      await resolver.removeRole(supportActor('support-1'), {
        roleSetID: 'rs-org',
        actorID: 'associate-1',
        role: RoleName.ASSOCIATE,
      } as any);
      await remove(supportActor('support-1'), 'associate-1', RoleName.ADMIN);

      expect(authorizeRemoveUser).toHaveBeenCalledTimes(2);
      expect(audit.record.mock.calls.map(call => call[0].action)).toEqual([
        'remove_member',
        'remove_role',
      ]);
    });

    it('writes no row when the role-limit check rejects the removal', async () => {
      roleSetService.removeActorFromRole.mockRejectedValue(
        new RoleSetPolicyRoleLimitsException('last owner', 'roles' as any)
      );

      await expect(
        remove(supportActor(), 'associate-1', RoleName.OWNER)
      ).rejects.toThrow(RoleSetPolicyRoleLimitsException);
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('Platform Support — self-targeted actions are refused', () => {
    it('cannot promote themself, even as an existing Associate', async () => {
      const support = supportActor('support-associate');
      await expect(
        assign(support, 'support-associate', RoleName.OWNER)
      ).rejects.toThrow(SELF_TARGET_REFUSAL_REASON);
      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('cannot remove a non-entry role from themself', async () => {
      await expect(
        remove(supportActor('support-1'), 'support-1', RoleName.ADMIN)
      ).rejects.toThrow(SELF_TARGET_REFUSAL_REASON);
      expect(roleSetService.removeActorFromRole).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('may still leave as an ordinary Associate: admitted by self-removal, not audited', async () => {
      await remove(
        supportActor('support-associate'),
        'support-associate',
        RoleName.ASSOCIATE
      );
      expect(roleSetService.removeActorFromRole).toHaveBeenCalledTimes(1);
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('organization admins — unchanged, never audited', () => {
    it('adds a new Associate, promotes and removes, writing no row', async () => {
      const admin = orgAdminActor();
      await assign(admin, 'stranger', RoleName.ASSOCIATE);
      await assign(admin, 'stranger-2', RoleName.ADMIN);
      await assign(admin, 'associate-1', RoleName.OWNER);
      await remove(admin, 'associate-1', RoleName.OWNER);
      await remove(admin, 'associate-1', RoleName.ASSOCIATE);

      expect(roleSetService.assignActorToRole).toHaveBeenCalledTimes(3);
      expect(roleSetService.removeActorFromRole).toHaveBeenCalledTimes(2);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('an actor who is both admin and Support acts as the admin — may act on themself, no row', async () => {
      const both = adminAndSupportActor('both-1');
      associates.add('both-1');
      await assign(both, 'both-1', RoleName.OWNER);
      await assign(both, 'associate-1', RoleName.ADMIN);
      expect(roleSetService.assignActorToRole).toHaveBeenCalledTimes(2);
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('no other platform role gains anything', () => {
    it('Content Full Access cannot assign or remove', async () => {
      await expect(
        assign(contentFullAccessActor(), 'associate-1', RoleName.ADMIN)
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      await expect(
        remove(contentFullAccessActor(), 'associate-1', RoleName.ASSOCIATE)
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
      expect(roleSetService.removeActorFromRole).not.toHaveBeenCalled();
    });
  });

  describe('Space role sets — unchanged', () => {
    it('Support gets nothing on a Space; its admin keeps every action; no row', async () => {
      await expect(
        assign(supportActor(), 'associate-1', RoleName.LEAD, 'rs-space')
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      await expect(
        remove(supportActor(), 'associate-1', RoleName.LEAD, 'rs-space')
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);

      const admin = spaceAdminActor();
      await assign(admin, 'stranger', RoleName.MEMBER, 'rs-space');
      await assign(admin, 'associate-1', RoleName.LEAD, 'rs-space');
      await remove(admin, 'associate-1', RoleName.LEAD, 'rs-space');
      expect(audit.record).not.toHaveBeenCalled();
    });
  });
});
