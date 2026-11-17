import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Application } from '@domain/access/application';
import { ApplicationService } from '@domain/access/application/application.service';
import { ApplicationAuthorizationService } from '@domain/access/application/application.service.authorization';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { ActorService } from '@domain/actor/actor/actor.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { RoleSet } from './role.set.entity';
import { RoleSetResolverMutationsMembership } from './role.set.resolver.mutations.membership';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { RoleSetCacheService } from './role.set.service.cache';

/**
 * Regression for server#6763: an application must never be stored with an
 * authorization policy that has no credential rules.
 *
 * The apply flow runs for real — resolver, RoleSetService,
 * RoleSetAuthorizationService, ApplicationService,
 * ApplicationAuthorizationService, AuthorizationPolicyService and
 * AuthorizationService are the production classes. Only the repositories are
 * replaced, by a store that keeps what each write persisted, so the
 * assertions are about stored rows rather than about calls.
 */

const ROLE_SET_ID = 'role-set-1';
const APPLICANT_ID = 'applicant-user';
const SIBLING_APPLICATION_ID = 'sibling-application';

const clone = <T>(value: T): T => structuredClone(value);

const roleSetPolicy = (): IAuthorizationPolicy =>
  ({
    id: 'role-set-policy',
    type: AuthorizationPolicyType.ROLE_SET,
    credentialRules: [
      {
        name: 'space-admin',
        grantedPrivileges: [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.GRANT,
        ],
        criterias: [
          { type: AuthorizationCredential.SPACE_ADMIN, resourceID: 'space-1' },
        ],
        cascade: true,
      },
      {
        name: 'registered-apply',
        grantedPrivileges: [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_APPLY],
        criterias: [
          { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
        ],
        cascade: false,
      },
    ],
    privilegeRules: [],
  }) as unknown as IAuthorizationPolicy;

type StoredApplication = {
  id: string;
  userID: string;
  roleSetID: string;
  lifecycle: unknown;
  policy: { id: string; type: string; credentialRules: unknown[] };
};

/** What the database would hold: one row per application, with its policy. */
class Store {
  applications = new Map<string, StoredApplication>();
  /** Every application write, as persisted at that moment. */
  applicationWrites: StoredApplication[] = [];
  /** Runs once the role set's applications were read — the race window. */
  afterRoleSetApplicationsLoaded: () => void = () => {};
  private sequence = 0;

  /**
   * `user` and `roleSet` are not eager on Application: like the database,
   * only hand them out when the read asked for them.
   */
  private toEntity(
    row: StoredApplication,
    relations: { user?: boolean; roleSet?: boolean } = {}
  ) {
    const stored = clone(row);
    return {
      id: stored.id,
      lifecycle: stored.lifecycle,
      authorization: { ...stored.policy, privilegeRules: [] },
      ...(relations.user ? { user: { id: stored.userID } } : {}),
      ...(relations.roleSet ? { roleSet: { id: stored.roleSetID } } : {}),
    };
  }

  applicationRepository = {
    save: async (application: any) => {
      application.id ??= `application-${++this.sequence}`;
      application.authorization.id ??= `policy-${++this.sequence}`;
      const row: StoredApplication = clone({
        id: application.id,
        userID: application.user.id,
        roleSetID: application.roleSet?.id,
        lifecycle: application.lifecycle,
        policy: {
          id: application.authorization.id,
          type: application.authorization.type,
          credentialRules: application.authorization.credentialRules,
        },
      });
      this.applications.set(row.id, row);
      this.applicationWrites.push(clone(row));
      return application;
    },
    findOne: async (options: any) => {
      const row = this.applications.get(options.where.id);
      return row ? this.toEntity(row, options.relations) : null;
    },
    find: async (options: any) =>
      [...this.applications.values()]
        .filter(
          row =>
            row.userID === options.where.user.id &&
            row.roleSetID === options.where.roleSet.id
        )
        .map(row => this.toEntity(row, options.relations)),
  };

  policyRepository = {
    save: async (policies: IAuthorizationPolicy[]) => {
      for (const policy of policies) {
        for (const row of this.applications.values()) {
          if (row.policy.id === policy.id) {
            row.policy.credentialRules = clone(policy.credentialRules);
          }
        }
      }
      return policies;
    },
  };

  roleSetRepository = {
    findOne: async (options: any) => {
      const roleSet: any = {
        id: ROLE_SET_ID,
        type: RoleSetType.SPACE,
        entryRoleName: RoleName.MEMBER,
        authorization: roleSetPolicy(),
        roles: [
          {
            name: RoleName.MEMBER,
            credential: {
              type: AuthorizationCredential.SPACE_MEMBER,
              resourceID: 'space-1',
            },
          },
        ],
      };
      if (options?.relations?.applications) {
        roleSet.applications = [...this.applications.values()]
          .filter(row => row.roleSetID === ROLE_SET_ID)
          .map(row => this.toEntity(row));
        roleSet.invitations = [];
        roleSet.platformInvitations = [];
        this.afterRoleSetApplicationsLoaded();
      }
      return roleSet;
    },
  };
}

describe('applyForEntryRoleOnRoleSet — stored application policy (server#6763)', () => {
  let resolver: RoleSetResolverMutationsMembership;
  let authorizationService: AuthorizationService;
  let store: Store;

  const applicant = {
    actorID: APPLICANT_ID,
    credentials: [
      { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
    ],
  } as unknown as ActorContext;

  const apply = () =>
    resolver.applyForEntryRoleOnRoleSet(applicant, {
      roleSetID: ROLE_SET_ID,
      questions: [],
    } as any);

  const storedApplicationOfApplicant = () => {
    const rows = [...store.applications.values()].filter(
      row => row.userID === APPLICANT_ID
    );
    expect(rows).toHaveLength(1);
    return rows[0];
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    store = new Store();
    const user = { id: APPLICANT_ID };
    // The static Application.create needs a DataSource; build the same entity.
    vi.spyOn(Application, 'create').mockImplementation((input: any) =>
      Object.assign(new Application(), input)
    );
    authorizationService = new AuthorizationService(
      MockWinstonProvider.useValue as any
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetResolverMutationsMembership,
        RoleSetService,
        RoleSetAuthorizationService,
        ApplicationService,
        ApplicationAuthorizationService,
        AuthorizationPolicyService,
        { provide: AuthorizationService, useValue: authorizationService },
        {
          provide: ConfigService,
          useValue: { get: () => 100 },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: store.applicationRepository,
        },
        {
          provide: getRepositoryToken(AuthorizationPolicy),
          useValue: store.policyRepository,
        },
        {
          provide: getRepositoryToken(RoleSet),
          useValue: store.roleSetRepository,
        },
        // Collaborators outside the flow under test, answering as they would
        // for a registered user with no membership, application or invitation.
        {
          provide: UserService,
          useValue: { getUserByIdOrFail: vi.fn().mockResolvedValue(user) },
        },
        {
          provide: UserLookupService,
          useValue: { getUserByIdOrFail: vi.fn().mockResolvedValue(user) },
        },
        {
          provide: LifecycleService,
          useValue: {
            createLifecycle: vi.fn().mockResolvedValue({ id: 'lifecycle-1' }),
          },
        },
        {
          provide: InvitationService,
          useValue: { findExistingInvitations: vi.fn().mockResolvedValue([]) },
        },
        {
          provide: ActorService,
          useValue: { hasValidCredential: vi.fn().mockResolvedValue(false) },
        },
        {
          provide: RoleSetCacheService,
          useValue: {
            getOpenApplicationFromCache: vi.fn().mockResolvedValue(undefined),
            getOpenInvitationFromCache: vi.fn().mockResolvedValue(undefined),
            getActorIsMemberFromCache: vi.fn().mockResolvedValue(undefined),
            setActorIsMemberCache: vi.fn().mockResolvedValue(undefined),
            deleteMembershipStatusCache: vi.fn().mockResolvedValue(undefined),
          },
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(RoleSetResolverMutationsMembership);
  });

  it('never persists an application whose policy has no credential rules', async () => {
    await apply();

    expect(store.applicationWrites.length).toBeGreaterThan(0);
    for (const write of store.applicationWrites) {
      expect(write.policy.credentialRules.length).toBeGreaterThan(0);
    }
  });

  it('leaves the new application readable when another application on the role set cannot have its policy applied', async () => {
    // Another user's application on the same role set, with a healthy policy…
    store.applications.set(SIBLING_APPLICATION_ID, {
      id: SIBLING_APPLICATION_ID,
      userID: 'other-user',
      roleSetID: ROLE_SET_ID,
      lifecycle: { id: 'lifecycle-sibling' },
      policy: {
        id: 'sibling-policy',
        type: AuthorizationPolicyType.APPLICATION,
        credentialRules: roleSetPolicy().credentialRules,
      },
    });
    // …that is deleted (withdrawn, or its user removed) after a role-set-wide
    // pass has read the role set's applications but before it reaches it.
    store.afterRoleSetApplicationsLoaded = () => {
      store.applications.delete(SIBLING_APPLICATION_ID);
    };

    // Whether the mutation itself reports the sibling is not the point: what
    // must hold is the state it leaves behind.
    await apply().catch(() => undefined);

    const stored = storedApplicationOfApplicant();
    const policy = stored.policy as unknown as IAuthorizationPolicy;
    expect(() =>
      authorizationService.validateAuthorization(
        policy,
        'Application.actor',
        AuthorizationPrivilege.READ
      )
    ).not.toThrow();
    expect(policy.credentialRules).toEqual(
      expect.arrayContaining([
        // inherited from the role set: its admins can read the application
        expect.objectContaining({ name: 'space-admin' }),
        // and the applicant can manage their own
        expect.objectContaining({
          criterias: [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: APPLICANT_ID,
            },
          ],
        }),
      ])
    );
  });
});
