import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import {
  adminAndSupportActor,
  contentFullAccessActor,
  orgAdminActor,
  orgChildPolicy,
  orgRoleSetPolicy,
  realAuthorizationService,
  registeredActor,
  spaceAdminActor,
  spaceRoleSetPolicy,
  supportActor,
} from '@test/utils/org.community.policy.fixture';
import {
  OrgCommunityGateService,
  SELF_TARGET_REFUSAL_REASON,
} from './org.community.gate.service';

describe('OrgCommunityGateService', () => {
  const gate = new OrgCommunityGateService(realAuthorizationService());

  describe('resolveBranch', () => {
    it('admits the organization admin on the entity-admin path', () => {
      expect(
        gate.resolveBranch(
          orgAdminActor(),
          orgRoleSetPolicy(),
          AuthorizationPrivilege.GRANT
        )
      ).toBe('entity-admin');
    });

    it('admits a Support-only actor on the platform-support path', () => {
      expect(
        gate.resolveBranch(
          supportActor(),
          orgRoleSetPolicy(),
          AuthorizationPrivilege.GRANT
        )
      ).toBe('platform-support');
    });

    it('prefers the entity-admin path for an actor holding both', () => {
      expect(
        gate.resolveBranch(
          adminAndSupportActor(),
          orgRoleSetPolicy(),
          AuthorizationPrivilege.GRANT
        )
      ).toBe('entity-admin');
    });

    it('admits nobody else — Content Full Access and a plain user get undefined', () => {
      for (const actor of [contentFullAccessActor(), registeredActor()]) {
        expect(
          gate.resolveBranch(
            actor,
            orgRoleSetPolicy(),
            AuthorizationPrivilege.GRANT
          )
        ).toBeUndefined();
      }
    });

    it('reaches child policies through the cascading membership rule', () => {
      expect(
        gate.resolveBranch(
          supportActor(),
          orgChildPolicy(),
          AuthorizationPrivilege.DELETE
        )
      ).toBe('platform-support');
    });

    it('admits Support on nothing before the organization is reset (no Support rules stored)', () => {
      expect(
        gate.resolveBranch(
          supportActor(),
          orgRoleSetPolicy({ withSupportRules: false }),
          AuthorizationPrivilege.GRANT
        )
      ).toBeUndefined();
    });

    it('never admits Support on a Space role-set policy, and leaves Space admins unchanged', () => {
      expect(
        gate.resolveBranch(
          supportActor(),
          spaceRoleSetPolicy(),
          AuthorizationPrivilege.GRANT
        )
      ).toBeUndefined();
      expect(
        gate.resolveBranch(
          spaceAdminActor(),
          spaceRoleSetPolicy(),
          AuthorizationPrivilege.GRANT
        )
      ).toBe('entity-admin');
    });

    it('attributes inviting by ROLESET_ENTRY_ROLE_ASSIGN: admins on their path, Support on its own', () => {
      expect(
        gate.resolveBranch(
          orgAdminActor(),
          orgRoleSetPolicy(),
          AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN
        )
      ).toBe('entity-admin');
      expect(
        gate.resolveBranch(
          supportActor(),
          orgRoleSetPolicy(),
          AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN
        )
      ).toBe('platform-support');
    });
  });

  describe('authorizeOrFail', () => {
    it('returns the branch that admitted the call', () => {
      expect(
        gate.authorizeOrFail(
          orgAdminActor(),
          orgRoleSetPolicy(),
          AuthorizationPrivilege.GRANT,
          'test'
        )
      ).toBe('entity-admin');
      expect(
        gate.authorizeOrFail(
          supportActor(),
          orgRoleSetPolicy(),
          AuthorizationPrivilege.GRANT,
          'test',
          { targetActorID: 'someone-else' }
        )
      ).toBe('platform-support');
    });

    it('throws the standard forbidden error for the base privilege when neither path admits', () => {
      const attempt = () =>
        gate.authorizeOrFail(
          contentFullAccessActor(),
          orgRoleSetPolicy(),
          AuthorizationPrivilege.GRANT,
          'assign role'
        );
      expect(attempt).toThrow(ForbiddenAuthorizationPolicyException);
      try {
        attempt();
      } catch (error) {
        expect(
          (error as ForbiddenAuthorizationPolicyException).checkedPrivilege
        ).toBe(AuthorizationPrivilege.GRANT);
        expect((error as Error).message).toContain('assign role');
      }
    });

    it('refuses a self-targeted action on the Support path with the fixed reason', () => {
      const actor = supportActor('support-self');
      const attempt = () =>
        gate.authorizeOrFail(
          actor,
          orgRoleSetPolicy(),
          AuthorizationPrivilege.GRANT,
          'assign role',
          { targetActorID: 'support-self' }
        );
      expect(attempt).toThrow(ForbiddenAuthorizationPolicyException);
      expect(attempt).toThrow(SELF_TARGET_REFUSAL_REASON);
    });

    it('carries the PLATFORM_SUPPORT_SELF_TARGET code and its numeric code', () => {
      const actor = supportActor('support-self');
      let thrown: unknown;
      try {
        gate.authorizeOrFail(
          actor,
          orgRoleSetPolicy(),
          AuthorizationPrivilege.GRANT,
          'assign role',
          { targetActorID: 'support-self' }
        );
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(ForbiddenAuthorizationPolicyException);
      const error = thrown as ForbiddenAuthorizationPolicyException;
      expect(error.code).toBe(AlkemioErrorStatus.PLATFORM_SUPPORT_SELF_TARGET);
      expect(error.extensions.code).toBe('PLATFORM_SUPPORT_SELF_TARGET');
      expect(error.extensions.numericCode).toBe(11118);
      expect(error.extensions.userMessage).toBe(
        'userMessages.authorization.platformSupportSelfTarget'
      );
    });

    it('does not apply the self-target refusal on the entity-admin path', () => {
      const actor = adminAndSupportActor('both-self');
      expect(
        gate.authorizeOrFail(
          actor,
          orgRoleSetPolicy(),
          AuthorizationPrivilege.GRANT,
          'assign role',
          { targetActorID: 'both-self' }
        )
      ).toBe('entity-admin');
    });
  });
});
