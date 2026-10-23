import { ActorType } from '@common/enums/actor.type';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleName } from '@common/enums/role.name';
import { RoleSetInvitationResultType } from '@common/enums/role.set.invitation.result.type';
import { RoleSetType } from '@common/enums/role.set.type';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { applicationLifecycleMachine } from '@domain/access/application/application.service.lifecycle';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { PlatformInvitationEmailBudgetService } from '@domain/access/invitation.platform/platform.invitation.email.budget.service';
import { PlatformInvitationResendThrottleService } from '@domain/access/invitation.platform/platform.invitation.resend.throttle.service';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationAdministrationAuditService } from '@src/platform-admin/organization-administration-audit/organization.administration.audit.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import {
  contentFullAccessActor,
  contentFullAccessAndSupportActor,
  orgAdminActor,
  orgChildPolicy,
  orgRoleSetPolicy,
  realAuthorizationService,
  spaceRoleSetPolicy,
  supportActor,
} from '@test/utils/org.community.policy.fixture';
import { type Mock } from 'vitest';
import {
  OrgCommunityGateService,
  SELF_TARGET_REFUSAL_REASON,
} from './org.community.gate.service';
import {
  RoleSetResolverMutationsMembership,
  SUPPORT_APPLICATION_EVENT_AUDIT_ACTIONS,
} from './role.set.resolver.mutations.membership';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { RoleSetCacheService } from './role.set.service.cache';

/**
 * Organization Community-tab invite / resend / application decisions on the
 * Platform Support path, evaluated against real-shaped stored policies by the
 * real AuthorizationService: one audit row per target on the Support path,
 * none for the organization's admins, no self-targeted Support actions, and
 * the excluded surfaces stay closed.
 */
describe('RoleSetResolverMutationsMembership — organization Community tab', () => {
  let resolver: RoleSetResolverMutationsMembership;
  let roleSetService: Record<string, Mock>;
  let invitationService: Record<string, Mock>;
  let platformInvitationService: Record<string, Mock>;
  let applicationService: Record<string, Mock>;
  let lifecycleService: Record<string, Mock>;
  let userLookupService: Record<string, Mock>;
  let actorLookupService: Record<string, Mock>;
  let audit: { record: Mock };
  let roleSetCacheService: Record<string, Mock>;

  const orgRoleSet = () => ({
    id: 'rs-org',
    type: RoleSetType.ORGANIZATION,
    entryRoleName: RoleName.ASSOCIATE,
    authorization: orgRoleSetPolicy(),
    parentRoleSet: undefined,
    license: { entitlements: [] },
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetResolverMutationsMembership,
        OrgCommunityGateService,
        { provide: AuthorizationService, useValue: realAuthorizationService() },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(RoleSetResolverMutationsMembership);
    roleSetService = module.get(RoleSetService) as any;
    invitationService = module.get(InvitationService) as any;
    platformInvitationService = module.get(PlatformInvitationService) as any;
    applicationService = module.get(ApplicationService) as any;
    lifecycleService = module.get(LifecycleService) as any;
    userLookupService = module.get(UserLookupService) as any;
    actorLookupService = module.get(ActorLookupService) as any;
    audit = module.get(OrganizationAdministrationAuditService) as any;
    roleSetCacheService = module.get(RoleSetCacheService) as any;
    audit.record.mockResolvedValue(undefined);

    // Invite path plumbing: every invitee is a registered user with no open
    // invitation, application or membership; roles have room.
    roleSetService.getRoleSetOrFail.mockResolvedValue(orgRoleSet());
    actorLookupService.validateActorsAndGetTypes.mockImplementation(
      async (ids: string[]) => new Map(ids.map(id => [id, ActorType.USER]))
    );
    actorLookupService.getActorTypeByIdOrFail.mockResolvedValue(ActorType.USER);
    roleSetService.getRoleDefinitions.mockImplementation(
      async (_rs: unknown, roles: RoleName[]) =>
        roles.map(name => ({
          name,
          userPolicy: { minimum: 0, maximum: 6 },
          organizationPolicy: { minimum: 0, maximum: 0 },
          virtualContributorPolicy: { minimum: 0, maximum: 0 },
        }))
    );
    roleSetService.getRoleDefinition.mockResolvedValue({
      userPolicy: { minimum: 0, maximum: 6 },
      organizationPolicy: { minimum: 0, maximum: 0 },
    });
    roleSetService.countActorsWithRole.mockResolvedValue(0);
    invitationService.countOpenInvitationsForRoleSet.mockResolvedValue(0);
    roleSetService.findOpenInvitation.mockResolvedValue(undefined);
    roleSetService.findOpenApplication.mockResolvedValue(undefined);
    roleSetService.isMember.mockResolvedValue(false);
    roleSetService.createInvitationExistingActor.mockImplementation(
      async (input: { invitedActorID: string }) => ({
        id: `inv-${input.invitedActorID}`,
        invitedActorID: input.invitedActorID,
      })
    );
    invitationService.getInvitationsOrFail.mockImplementation(
      async (ids: string[]) =>
        ids.map(id => ({ id, invitedActorID: id.replace(/^inv-/, '') }))
    );
    userLookupService.getUserByEmail.mockResolvedValue(undefined);
    platformInvitationService.getExistingPlatformInvitationForRoleSet.mockResolvedValue(
      undefined
    );
    roleSetService.createPlatformInvitation.mockResolvedValue({
      id: 'pinv-1',
      email: 'new@example.org',
    });
    (
      module.get(PlatformInvitationEmailBudgetService) as any
    ).claim.mockResolvedValue('ok');
    (
      module.get(PlatformInvitationResendThrottleService) as any
    ).claim.mockResolvedValue(true);
    (
      module.get(RoleSetAuthorizationService) as any
    ).applyAuthorizationPolicyOnInvitationsApplications.mockResolvedValue([]);
    (
      module.get(OrganizationLookupService) as any
    ).getOrganizationForRoleSetOrFail.mockResolvedValue({ id: 'org-1' });
  });

  const invite = (
    actor: ActorContext,
    invitedActorIDs: string[],
    invitedUserEmails: string[] = [],
    extraRoles: RoleName[] = [RoleName.ADMIN]
  ) =>
    resolver.inviteForEntryRoleOnRoleSet(actor, {
      roleSetID: 'rs-org',
      invitedActorIDs,
      invitedUserEmails,
      extraRoles,
    } as any);

  describe('inviteForEntryRoleOnRoleSet', () => {
    it('lets Support invite two users and an address, writing one row per created invitation', async () => {
      const support = supportActor('support-1');

      const results = await invite(
        support,
        ['user-a', 'user-b'],
        ['new@example.org']
      );

      expect(results.map(r => r.type)).toEqual([
        RoleSetInvitationResultType.INVITED_TO_ROLE_SET,
        RoleSetInvitationResultType.INVITED_TO_ROLE_SET,
        RoleSetInvitationResultType.INVITED_TO_PLATFORM_AND_ROLE_SET,
      ]);
      expect(audit.record).toHaveBeenCalledTimes(3);
      expect(audit.record.mock.calls.map(call => call[0])).toEqual([
        {
          actorContext: support,
          roleSetId: 'rs-org',
          action: 'invite_user',
          targetUserId: 'user-a',
          invitationId: 'inv-user-a',
          roles: [RoleName.ADMIN],
        },
        {
          actorContext: support,
          roleSetId: 'rs-org',
          action: 'invite_user',
          targetUserId: 'user-b',
          invitationId: 'inv-user-b',
          roles: [RoleName.ADMIN],
        },
        {
          actorContext: support,
          roleSetId: 'rs-org',
          action: 'invite_email',
          platformInvitationId: 'pinv-1',
          roles: [RoleName.ADMIN],
        },
      ]);
      for (const [row] of audit.record.mock.calls) {
        expect(
          JSON.stringify({ ...row, actorContext: undefined })
        ).not.toContain('@');
      }
    });

    it('keeps the rows when follow-up work fails after the invitations exist', async () => {
      invitationService.getInvitationsOrFail.mockRejectedValue(
        new Error('reload failed')
      );

      await expect(
        invite(supportActor('support-1'), ['user-a'], ['new@example.org'])
      ).rejects.toThrow('reload failed');

      expect(audit.record.mock.calls.map(call => call[0].action)).toEqual([
        'invite_user',
        'invite_email',
      ]);
    });

    it('refuses Support inviting themself by id, creating nothing', async () => {
      await expect(
        invite(supportActor('support-1'), ['user-a', 'support-1'])
      ).rejects.toThrow(SELF_TARGET_REFUSAL_REASON);
      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
      expect(roleSetService.createPlatformInvitation).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('refuses Support inviting their own address once it resolves to themself', async () => {
      userLookupService.getUserByEmail.mockImplementation(
        async (email: string) =>
          email === 'support@example.org' ? { id: 'support-1' } : undefined
      );

      await expect(
        invite(supportActor('support-1'), [], ['support@example.org'])
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('writes no row for the organization admin, who may also invite themself as before', async () => {
      await invite(orgAdminActor('org-admin-user'), ['user-a']);
      expect(
        roleSetService.createInvitationExistingActor
      ).toHaveBeenCalledTimes(1);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('refuses Content Full Access at the invite gate', async () => {
      await expect(
        invite(contentFullAccessActor(), ['user-a'])
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
    });

    it('is unchanged on a Space role set: Support refused, no row', async () => {
      roleSetService.getRoleSetOrFail.mockResolvedValue({
        id: 'rs-space',
        type: RoleSetType.SPACE,
        entryRoleName: RoleName.MEMBER,
        authorization: spaceRoleSetPolicy(),
        parentRoleSet: undefined,
        license: { entitlements: [] },
      });
      await expect(invite(supportActor(), ['user-a'], [], [])).rejects.toThrow(
        ForbiddenAuthorizationPolicyException
      );
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('resendPlatformInvitation', () => {
    const emailInvitation = () => ({
      id: 'pinv-1',
      email: 'new@example.org',
      profileCreated: false,
      welcomeMessage: 'Welcome',
      roleSetExtraRoles: [RoleName.ADMIN],
      roleSet: orgRoleSet(),
    });

    it('lets Support resend and writes one row', async () => {
      platformInvitationService.getPlatformInvitationOrFail.mockResolvedValue(
        emailInvitation()
      );
      const support = supportActor('support-1');

      await resolver.resendPlatformInvitation(support, { ID: 'pinv-1' });

      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith({
        actorContext: support,
        roleSetId: 'rs-org',
        action: 'resend_email_invitation',
        platformInvitationId: 'pinv-1',
      });
    });

    it('writes no row when the resend is refused (consumed)', async () => {
      platformInvitationService.getPlatformInvitationOrFail.mockResolvedValue({
        ...emailInvitation(),
        profileCreated: true,
      });
      await expect(
        resolver.resendPlatformInvitation(supportActor(), { ID: 'pinv-1' })
      ).rejects.toThrow();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('writes no row for the organization admin', async () => {
      platformInvitationService.getPlatformInvitationOrFail.mockResolvedValue(
        emailInvitation()
      );
      await resolver.resendPlatformInvitation(orgAdminActor(), {
        ID: 'pinv-1',
      });
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('eventOnApplication', () => {
    /** An organization application: inherits the role set's cascading rules,
     * plus the applicant's own READ/UPDATE/DELETE. */
    const applicationPolicy = (applicantID: string): IAuthorizationPolicy => {
      const policy = orgChildPolicy();
      return {
        ...policy,
        credentialRules: [
          ...policy.credentialRules,
          {
            name: 'applicant-self',
            grantedPrivileges: [
              AuthorizationPrivilege.READ,
              AuthorizationPrivilege.UPDATE,
              AuthorizationPrivilege.DELETE,
            ],
            criterias: [
              {
                type: AuthorizationCredential.USER_SELF_MANAGEMENT,
                resourceID: applicantID,
              },
            ],
            cascade: true,
          },
        ],
      } as IAuthorizationPolicy;
    };

    const arrange = (applicantID: string, states: string[]) => {
      const application = {
        id: 'app-1',
        authorization: applicationPolicy(applicantID),
        lifecycle: { id: 'lc-1' },
        user: { id: applicantID },
        roleSet: { id: 'rs-org', type: RoleSetType.ORGANIZATION },
      };
      applicationService.getApplicationOrFail.mockResolvedValue(application);
      lifecycleService.event.mockResolvedValue(undefined);
      let call = 0;
      lifecycleService.getState.mockImplementation(
        () => states[Math.min(call++, states.length - 1)]
      );
      roleSetService.approveApplication.mockResolvedValue(undefined);
    };

    it('lets Support approve another user and writes one approve_application row', async () => {
      arrange('applicant-1', ['approving', 'approved']);
      const support = supportActor('support-1');

      await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName: 'APPROVE' } as any,
        support
      );

      expect(roleSetService.approveApplication).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith({
        actorContext: support,
        roleSetId: 'rs-org',
        action: 'approve_application',
        targetUserId: 'applicant-1',
        applicationId: 'app-1',
      });
    });

    it('lets Support reject and writes one reject_application row', async () => {
      arrange('applicant-1', ['rejected']);

      await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName: 'REJECT' } as any,
        supportActor('support-1')
      );

      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record.mock.calls[0][0].action).toBe('reject_application');
    });

    it('keeps the row when the cache update after approval fails', async () => {
      arrange('applicant-1', ['approving', 'approved']);
      roleSetCacheService.deleteOpenApplicationFromCache.mockRejectedValueOnce(
        new Error('cache down')
      );

      await expect(
        resolver.eventOnApplication(
          { applicationID: 'app-1', eventName: 'APPROVE' } as any,
          supportActor('support-1')
        )
      ).rejects.toThrow('cache down');

      expect(roleSetService.approveApplication).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record.mock.calls[0][0].action).toBe('approve_application');
    });

    it.each([
      ['ARCHIVE', 'archived', 'archive_application'],
      ['REOPEN', 'new', 'reopen_application'],
      ['APPROVED', 'approved', 'mark_application_approved'],
    ])('lets Support send %s and writes exactly one row', async (eventName, state, action) => {
      arrange('applicant-1', [state]);
      const support = supportActor('support-1');

      await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName } as any,
        support
      );

      expect(lifecycleService.event).toHaveBeenCalledTimes(1);
      expect(roleSetService.approveApplication).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith({
        actorContext: support,
        roleSetId: 'rs-org',
        action,
        targetUserId: 'applicant-1',
        applicationId: 'app-1',
      });
    });

    it.each([
      ['ARCHIVE', 'archived'],
      ['REOPEN', 'new'],
      ['APPROVED', 'approved'],
    ])('writes no row when the organization admin sends %s', async (eventName, state) => {
      arrange('applicant-1', [state]);

      await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName } as any,
        orgAdminActor()
      );

      expect(lifecycleService.event).toHaveBeenCalledTimes(1);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('maps every event the application lifecycle accepts to an audit action', () => {
      const machineEvents = new Set(
        Object.values(applicationLifecycleMachine.states ?? {}).flatMap(state =>
          Object.keys((state as { on?: object }).on ?? {})
        )
      );
      expect(machineEvents.size).toBeGreaterThan(0);
      expect(
        Object.keys(SUPPORT_APPLICATION_EVENT_AUDIT_ACTIONS).sort()
      ).toEqual([...machineEvents].sort());
    });

    it('refuses Support approving their own application before any event fires', async () => {
      arrange('support-1', ['approving', 'approved']);

      await expect(
        resolver.eventOnApplication(
          { applicationID: 'app-1', eventName: 'APPROVE' } as any,
          supportActor('support-1')
        )
      ).rejects.toThrow(SELF_TARGET_REFUSAL_REASON);
      expect(lifecycleService.event).not.toHaveBeenCalled();
      expect(roleSetService.approveApplication).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('still lets a Support user withdraw (reject) their own application as the applicant, unaudited', async () => {
      arrange('support-1', ['rejected']);

      await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName: 'REJECT' } as any,
        supportActor('support-1')
      );

      expect(lifecycleService.event).toHaveBeenCalledTimes(1);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('writes no row for the organization admin', async () => {
      arrange('applicant-1', ['approving', 'approved']);

      await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName: 'APPROVE' } as any,
        orgAdminActor()
      );

      expect(audit.record).not.toHaveBeenCalled();
    });

    it.each([
      ['APPROVE', ['approving', 'approved'], 'approve_application'],
      ['APPROVED', ['approved'], 'mark_application_approved'],
    ])('audits %s by a Content Full Access + Support holder, whose GRANT comes only from Support', async (eventName, states, action) => {
      arrange('applicant-1', states);
      const actor = contentFullAccessAndSupportActor();

      await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName } as any,
        actor
      );

      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith({
        actorContext: actor,
        roleSetId: 'rs-org',
        action,
        targetUserId: 'applicant-1',
        applicationId: 'app-1',
      });
    });

    it('writes no row when a Content Full Access + Support holder rejects through the root-cascade UPDATE', async () => {
      arrange('applicant-1', ['rejected']);

      await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName: 'REJECT' } as any,
        contentFullAccessAndSupportActor()
      );

      expect(audit.record).not.toHaveBeenCalled();
    });

    it('admits Content Full Access only through its pre-existing root-cascade UPDATE, and never audits it', async () => {
      arrange('applicant-1', ['rejected']);

      await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName: 'REJECT' } as any,
        contentFullAccessActor()
      );

      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('surfaces that stay closed to Support', () => {
    it('updateApplicationFormOnRoleSet stays on plain UPDATE: Support is refused', async () => {
      await expect(
        resolver.updateApplicationFormOnRoleSet(supportActor(), {
          roleSetID: 'rs-org',
          formData: {},
        } as any)
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(roleSetService.updateApplicationForm).not.toHaveBeenCalled();
    });

    it('eventOnInvitation stays on plain UPDATE: Support cannot REVOKE through the lifecycle', async () => {
      invitationService.getInvitationOrFail.mockResolvedValue({
        id: 'inv-1',
        invitedActorID: 'invitee-1',
        authorization: orgChildPolicy(),
        lifecycle: { id: 'lc-1' },
        roleSet: { id: 'rs-org', type: RoleSetType.ORGANIZATION },
      });

      await expect(
        resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'REVOKE' } as any,
          supportActor()
        )
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(lifecycleService.event).not.toHaveBeenCalled();
    });

    it('Content Full Access gains no invite or resend reach', async () => {
      await expect(
        invite(contentFullAccessActor(), ['user-a'])
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      platformInvitationService.getPlatformInvitationOrFail.mockResolvedValue({
        id: 'pinv-1',
        email: 'new@example.org',
        profileCreated: false,
        roleSet: orgRoleSet(),
      });
      await expect(
        resolver.resendPlatformInvitation(contentFullAccessActor(), {
          ID: 'pinv-1',
        })
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
    });
  });
});
