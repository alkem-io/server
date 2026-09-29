import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { RoleName } from '@common/enums/role.name';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { FormResponseAccessService } from './callout.form.response.access.service';

const SUBSPACE = 'subspace-1';
const PARENT = 'space-1';
const CREATOR = 'user-creator';

const cred = (
  type: AuthorizationCredential,
  resourceID = ''
): ICredentialDefinition => ({ type, resourceID });

const actor = (
  actorID: string,
  ...credentials: ICredentialDefinition[]
): ActorContext => {
  const context = new ActorContext();
  context.actorID = actorID;
  context.credentials = credentials;
  return context;
};

// Every credential type used below can read the Post (the precondition);
// the outsider cannot.
const calloutAuthorization = () => {
  const policy = new AuthorizationPolicy(AuthorizationPolicyType.CALLOUT);
  policy.id = 'callout-auth';
  policy.credentialRules = [
    {
      grantedPrivileges: [AuthorizationPrivilege.READ],
      criterias: [
        cred(AuthorizationCredential.SPACE_MEMBER, SUBSPACE),
        cred(AuthorizationCredential.SPACE_MEMBER, PARENT),
        cred(AuthorizationCredential.SPACE_ADMIN, SUBSPACE),
        cred(AuthorizationCredential.SPACE_ADMIN, PARENT),
        cred(AuthorizationCredential.GLOBAL_ADMIN),
        cred(AuthorizationCredential.GLOBAL_SUPPORT),
        cred(AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS),
        cred(AuthorizationCredential.PLATFORM_SUPPORT),
        cred(AuthorizationCredential.GLOBAL_SPACES_READER),
        cred(AuthorizationCredential.PLATFORM_SPACES_READER),
        cred(AuthorizationCredential.USER_SELF_MANAGEMENT, CREATOR),
        cred(AuthorizationCredential.USER_SELF_MANAGEMENT, 'user-other'),
      ],
      cascade: true,
      name: 'read',
    },
  ] as any;
  return policy;
};

const calloutsSetAuthorization = () => {
  const policy = new AuthorizationPolicy(AuthorizationPolicyType.CALLOUTS_SET);
  policy.id = 'set-auth';
  policy.credentialRules = [
    {
      grantedPrivileges: [AuthorizationPrivilege.CREATE],
      criterias: [
        cred(AuthorizationCredential.SPACE_ADMIN, SUBSPACE),
        cred(AuthorizationCredential.SPACE_ADMIN, PARENT),
        cred(AuthorizationCredential.GLOBAL_ADMIN),
      ],
      cascade: true,
      name: 'create',
    },
  ] as any;
  return policy;
};

describe('FormResponseAccessService', () => {
  const logger = {
    verbose: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
  const roleSetService = {
    getCredentialsForRoleWithParents: vi.fn(),
    getCredentialForRole: vi.fn(),
  };
  let service: FormResponseAccessService;

  const callout = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'callout-1',
      authorization: calloutAuthorization(),
      calloutsSet: {
        type: CalloutsSetType.COLLABORATION,
        authorization: calloutsSetAuthorization(),
        collaboration: {
          space: { community: { roleSet: { id: 'roleset-1' } } },
        },
      },
      ...overrides,
    }) as any;

  const form = (visibility: CalloutFormResponseVisibility) =>
    ({ id: 'form-1', visibility }) as any;

  beforeEach(() => {
    vi.resetAllMocks();
    const authorizationService = new AuthorizationService(logger as any);
    const authorizationPolicyService = new AuthorizationPolicyService(
      {} as any,
      authorizationService,
      logger as any,
      { get: () => 10 } as any
    );
    roleSetService.getCredentialsForRoleWithParents.mockResolvedValue([
      cred(AuthorizationCredential.SPACE_ADMIN, SUBSPACE),
      cred(AuthorizationCredential.SPACE_ADMIN, PARENT),
    ]);
    roleSetService.getCredentialForRole.mockResolvedValue(
      cred(AuthorizationCredential.SPACE_MEMBER, SUBSPACE)
    );
    service = new FormResponseAccessService(
      authorizationService,
      authorizationPolicyService,
      roleSetService as any
    );
  });

  describe('resolveScope', () => {
    const readers: [string, ActorContext, 'ALL' | 'OWN', 'ALL' | 'OWN'][] = [
      // name, actor, scope under ADMINS, scope under MEMBERS
      [
        'subspace admin',
        actor('u1', cred(AuthorizationCredential.SPACE_ADMIN, SUBSPACE)),
        'ALL',
        'ALL',
      ],
      [
        'parent space admin',
        actor('u2', cred(AuthorizationCredential.SPACE_ADMIN, PARENT)),
        'ALL',
        'ALL',
      ],
      [
        'subspace member',
        actor('u3', cred(AuthorizationCredential.SPACE_MEMBER, SUBSPACE)),
        'OWN',
        'ALL',
      ],
      [
        'parent space member',
        actor('u4', cred(AuthorizationCredential.SPACE_MEMBER, PARENT)),
        'OWN',
        'OWN',
      ],
      [
        'global admin',
        actor('u5', cred(AuthorizationCredential.GLOBAL_ADMIN)),
        'ALL',
        'ALL',
      ],
      [
        'global support',
        actor('u6', cred(AuthorizationCredential.GLOBAL_SUPPORT)),
        'ALL',
        'ALL',
      ],
      [
        'platform content full access',
        actor('u7', cred(AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS)),
        'OWN',
        'OWN',
      ],
      [
        'platform support',
        actor('u8', cred(AuthorizationCredential.PLATFORM_SUPPORT)),
        'OWN',
        'OWN',
      ],
      [
        'global spaces reader',
        actor('u9', cred(AuthorizationCredential.GLOBAL_SPACES_READER)),
        'OWN',
        'OWN',
      ],
      [
        'platform spaces reader',
        actor('u10', cred(AuthorizationCredential.PLATFORM_SPACES_READER)),
        'OWN',
        'OWN',
      ],
      [
        'ex-admin creator (only the creator credential)',
        actor(
          CREATOR,
          cred(AuthorizationCredential.USER_SELF_MANAGEMENT, CREATOR)
        ),
        'OWN',
        'OWN',
      ],
    ];

    it.each(
      readers
    )('%s -> ADMINS: %s', async (_name, actorContext, admins) => {
      expect(
        await service.resolveScope(
          actorContext,
          form(CalloutFormResponseVisibility.ADMINS),
          callout()
        )
      ).toBe(admins);
    });

    it.each(
      readers
    )('%s -> MEMBERS: %s', async (_name, actorContext, _admins, members) => {
      expect(
        await service.resolveScope(
          actorContext,
          form(CalloutFormResponseVisibility.MEMBERS),
          callout()
        )
      ).toBe(members);
    });

    it('asks for the member credential only when the Form shows responses to members', async () => {
      await service.resolveScope(
        actor('u3', cred(AuthorizationCredential.SPACE_MEMBER, SUBSPACE)),
        form(CalloutFormResponseVisibility.ADMINS),
        callout()
      );
      expect(roleSetService.getCredentialForRole).not.toHaveBeenCalled();

      await service.resolveScope(
        actor('u3', cred(AuthorizationCredential.SPACE_MEMBER, SUBSPACE)),
        form(CalloutFormResponseVisibility.MEMBERS),
        callout()
      );
      expect(roleSetService.getCredentialForRole).toHaveBeenCalledWith(
        { id: 'roleset-1' },
        RoleName.MEMBER
      );
    });

    it('is forbidden when the actor cannot read the Post itself', async () => {
      await expect(
        service.resolveScope(
          actor('outsider'),
          form(CalloutFormResponseVisibility.MEMBERS),
          callout()
        )
      ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
    });

    it('never returns ALL for anonymous: the Post READ precondition fails or the scope is NONE', async () => {
      const anonymous = actor('');
      anonymous.isAnonymous = true;
      const open = callout();
      open.authorization.credentialRules = [
        {
          grantedPrivileges: [AuthorizationPrivilege.READ],
          criterias: [cred(AuthorizationCredential.GLOBAL_ANONYMOUS)],
          cascade: true,
          name: 'public read',
        },
      ];
      anonymous.credentials = [cred(AuthorizationCredential.GLOBAL_ANONYMOUS)];
      expect(
        await service.resolveScope(
          anonymous,
          form(CalloutFormResponseVisibility.MEMBERS),
          open
        )
      ).toBe('NONE');
    });

    it('fails closed to the platform list when the roleSet is missing', async () => {
      const noRoleSet = callout({
        calloutsSet: {
          type: CalloutsSetType.COLLABORATION,
          authorization: calloutsSetAuthorization(),
        },
      });
      expect(
        await service.resolveScope(
          actor('u1', cred(AuthorizationCredential.SPACE_ADMIN, SUBSPACE)),
          form(CalloutFormResponseVisibility.ADMINS),
          noRoleSet
        )
      ).toBe('OWN');
      expect(
        await service.resolveScope(
          actor('u5', cred(AuthorizationCredential.GLOBAL_ADMIN)),
          form(CalloutFormResponseVisibility.ADMINS),
          noRoleSet
        )
      ).toBe('ALL');
    });

    it('takes the platform readers from the shared draft-Post helper', async () => {
      const helper = await import(
        '../callout/callout.platform.read.credentials'
      );
      const spy = vi.spyOn(helper, 'getDraftCalloutPlatformReadCredentials');
      await service.resolveScope(
        actor('u5', cred(AuthorizationCredential.GLOBAL_ADMIN)),
        form(CalloutFormResponseVisibility.ADMINS),
        callout()
      );
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('moderation', () => {
    it.each([
      [
        'subspace admin',
        actor('u1', cred(AuthorizationCredential.SPACE_ADMIN, SUBSPACE)),
        true,
      ],
      [
        'parent admin',
        actor('u2', cred(AuthorizationCredential.SPACE_ADMIN, PARENT)),
        true,
      ],
      [
        'global admin',
        actor('u5', cred(AuthorizationCredential.GLOBAL_ADMIN)),
        true,
      ],
      [
        'creator without CREATE',
        actor(
          CREATOR,
          cred(AuthorizationCredential.USER_SELF_MANAGEMENT, CREATOR)
        ),
        false,
      ],
      [
        'global support without CREATE',
        actor('u6', cred(AuthorizationCredential.GLOBAL_SUPPORT)),
        false,
      ],
      [
        'member',
        actor('u3', cred(AuthorizationCredential.SPACE_MEMBER, SUBSPACE)),
        false,
      ],
    ])('%s -> canModerate %s', (_name, actorContext, expected) => {
      expect(service.canModerate(actorContext, callout())).toBe(expected);
      if (expected) {
        expect(() =>
          service.assertCanModerate(actorContext, callout())
        ).not.toThrow();
      } else {
        expect(() =>
          service.assertCanModerate(actorContext, callout())
        ).toThrow(ForbiddenAuthorizationPolicyException);
      }
    });

    it('never moderates on a knowledge base callouts set', () => {
      const admin = actor(
        'u1',
        cred(AuthorizationCredential.SPACE_ADMIN, SUBSPACE)
      );
      const kb = callout({
        calloutsSet: {
          type: CalloutsSetType.KNOWLEDGE_BASE,
          authorization: calloutsSetAuthorization(),
        },
      });
      expect(service.canModerate(admin, kb)).toBe(false);
      expect(() => service.assertCanModerate(admin, kb)).toThrow(
        ForbiddenAuthorizationPolicyException
      );
    });

    it('is false without a callouts set', () => {
      expect(
        service.canModerate(
          actor('u1', cred(AuthorizationCredential.SPACE_ADMIN, SUBSPACE)),
          callout({ calloutsSet: undefined })
        )
      ).toBe(false);
    });
  });
});
