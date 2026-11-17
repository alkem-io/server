import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Application } from '@domain/access/application';
import { ApplicationService } from '@domain/access/application/application.service';
import { ApplicationAuthorizationService } from '@domain/access/application/application.service.authorization';
import { Invitation } from '@domain/access/invitation';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { PlatformInvitation } from '@domain/access/invitation.platform';
import { PlatformInvitationEmailBudgetService } from '@domain/access/invitation.platform/platform.invitation.email.budget.service';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { PlatformInvitationAuthorizationService } from '@domain/access/invitation.platform/platform.invitation.service.authorization';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
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
 * Regression for server#6763, invitation side: an invitation — to an existing
 * actor or to an email address without an account — must never be stored with
 * an authorization policy that has no credential rules.
 *
 * The invite flow runs for real: resolver, RoleSetService,
 * RoleSetAuthorizationService, the invitation, platform invitation and
 * application services with their authorization services,
 * AuthorizationPolicyService and AuthorizationService are the production
 * classes. Only the repositories are replaced, by a store that keeps what each
 * write persisted, so the assertions are about stored rows, not about calls.
 */

const ROLE_SET_ID = 'role-set-1';
const SPACE_ID = 'space-1';
const INVITER_ID = 'inviter-user';
const INVITEE_ID = '0b0c6a3e-6d0e-4a4c-9d5d-6a1f0f1d2c3b';
const INVITEE_ACCOUNT_ID = 'invitee-account';
const EXTERNAL_EMAIL = 'new.person@example.org';
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
          AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE,
        ],
        criterias: [
          { type: AuthorizationCredential.SPACE_ADMIN, resourceID: SPACE_ID },
        ],
        cascade: true,
      },
    ],
    privilegeRules: [],
  }) as unknown as IAuthorizationPolicy;

type Kind = 'application' | 'invitation' | 'platformInvitation';

type Row = {
  kind: Kind;
  id: string;
  roleSetID?: string;
  /** Every column other than the relations and the policy. */
  fields: Record<string, unknown>;
  policy: { id: string; type: string; credentialRules: unknown[] };
};

/** What the database would hold: one row per entity, with its policy. */
class Store {
  rows = new Map<string, Row>();
  /** Every entity write, as persisted at that moment. */
  writes: Row[] = [];
  /** Runs once the role set's children were read — the race window. */
  afterRoleSetChildrenLoaded: () => void = () => {};
  private sequence = 0;

  of(kind: Kind) {
    return [...this.rows.values()].filter(row => row.kind === kind);
  }

  /**
   * `roleSet` (and an application's `user`) are not eager: like the database,
   * only hand them out when the read asked for them.
   */
  private toEntity(
    row: Row,
    relations: { user?: boolean; roleSet?: boolean } = {}
  ) {
    const stored = clone(row);
    return {
      ...stored.fields,
      id: stored.id,
      authorization: { ...stored.policy, privilegeRules: [] },
      ...(relations.user && stored.kind === 'application'
        ? { user: { id: stored.fields.userID } }
        : {}),
      ...(relations.roleSet ? { roleSet: { id: stored.roleSetID } } : {}),
    };
  }

  private matches(row: Row, where: Record<string, any> = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (key === 'roleSet') return row.roleSetID === value.id;
      if (key === 'id' && typeof value === 'object') {
        // typeorm In([...])
        return (value.value as string[]).includes(row.id);
      }
      if (key === 'id') return row.id === value;
      return row.fields[key] === value;
    });
  }

  repository(kind: Kind) {
    return {
      save: async (entity: any) => {
        entity.id ??= `${kind}-${++this.sequence}`;
        entity.authorization.id ??= `policy-${++this.sequence}`;
        const { id, authorization, roleSet, user, ...fields } = entity;
        const row: Row = clone({
          kind,
          id,
          roleSetID: roleSet?.id ?? this.rows.get(id)?.roleSetID,
          fields: { ...fields, ...(user ? { userID: user.id } : {}) },
          policy: {
            id: authorization.id,
            type: authorization.type,
            credentialRules: authorization.credentialRules,
          },
        });
        this.rows.set(row.id, row);
        this.writes.push(row);
        return entity;
      },
      findOne: async (options: any) => {
        const row = this.of(kind).find(candidate =>
          this.matches(candidate, options.where)
        );
        return row ? this.toEntity(row, options.relations) : null;
      },
      find: async (options: any) =>
        this.of(kind)
          .filter(row => this.matches(row, options.where))
          .map(row => this.toEntity(row, options.relations)),
      findBy: async (where: any) =>
        this.of(kind)
          .filter(row => this.matches(row, where))
          .map(row => this.toEntity(row)),
    };
  }

  policyRepository = {
    save: async (policies: IAuthorizationPolicy[]) => {
      for (const policy of policies) {
        for (const row of this.rows.values()) {
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
              resourceID: SPACE_ID,
            },
          },
        ],
      };
      if (options?.relations?.applications) {
        const children = (kind: Kind) =>
          this.of(kind)
            .filter(row => row.roleSetID === ROLE_SET_ID)
            .map(row => this.toEntity(row));
        roleSet.applications = children('application');
        roleSet.invitations = children('invitation');
        roleSet.platformInvitations = children('platformInvitation');
        this.afterRoleSetChildrenLoaded();
      }
      return roleSet;
    },
  };
}

describe('inviteForEntryRoleOnRoleSet — stored invitation policies (server#6763)', () => {
  let resolver: RoleSetResolverMutationsMembership;
  let authorizationService: AuthorizationService;
  let store: Store;

  const inviter = {
    actorID: INVITER_ID,
    credentials: [
      { type: AuthorizationCredential.SPACE_ADMIN, resourceID: SPACE_ID },
    ],
  } as unknown as ActorContext;

  /** One registered user and one address without an account. */
  const invite = () =>
    resolver.inviteForEntryRoleOnRoleSet(inviter, {
      roleSetID: ROLE_SET_ID,
      invitedActorIDs: [INVITEE_ID],
      invitedUserEmails: [EXTERNAL_EMAIL],
      extraRoles: [],
    } as any);

  const theOnly = (kind: Kind) => {
    const rows = store.of(kind);
    expect(rows).toHaveLength(1);
    return rows[0];
  };

  const expectReadable = (row: Row, message: string) => {
    const policy = row.policy as unknown as IAuthorizationPolicy;
    expect(() =>
      authorizationService.validateAuthorization(
        policy,
        message,
        AuthorizationPrivilege.READ
      )
    ).not.toThrow();
    // inherited from the role set: its admins can read what they created
    expect(policy.credentialRules).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'space-admin' })])
    );
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    store = new Store();
    authorizationService = new AuthorizationService(
      MockWinstonProvider.useValue as any
    );
    // The static create() needs a DataSource; build the same entities.
    for (const entity of [Application, Invitation, PlatformInvitation]) {
      vi.spyOn(entity as any, 'create').mockImplementation((input: any) =>
        Object.assign(new (entity as any)(), input)
      );
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetResolverMutationsMembership,
        RoleSetService,
        RoleSetAuthorizationService,
        ApplicationService,
        ApplicationAuthorizationService,
        InvitationService,
        InvitationAuthorizationService,
        PlatformInvitationService,
        PlatformInvitationAuthorizationService,
        AuthorizationPolicyService,
        { provide: AuthorizationService, useValue: authorizationService },
        { provide: ConfigService, useValue: { get: () => 100 } },
        {
          provide: getRepositoryToken(Application),
          useValue: store.repository('application'),
        },
        {
          provide: getRepositoryToken(Invitation),
          useValue: store.repository('invitation'),
        },
        {
          provide: getRepositoryToken(PlatformInvitation),
          useValue: store.repository('platformInvitation'),
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
        // for a space admin inviting a registered user, who is neither a
        // member nor already invited, and an address without an account.
        {
          provide: ActorLookupService,
          useValue: {
            validateActorsAndGetTypes: vi
              .fn()
              .mockResolvedValue(new Map([[INVITEE_ID, ActorType.USER]])),
            getActorByIdOrFail: vi.fn().mockResolvedValue({ id: INVITEE_ID }),
            getActorTypeByIdOrFail: vi.fn().mockResolvedValue(ActorType.USER),
            getFullActorById: vi.fn().mockResolvedValue({
              id: INVITEE_ID,
              type: ActorType.USER,
              accountID: INVITEE_ACCOUNT_ID,
            }),
          },
        },
        {
          provide: UserLookupService,
          useValue: { getUserByEmail: vi.fn().mockResolvedValue(null) },
        },
        {
          provide: PlatformInvitationEmailBudgetService,
          useValue: { claim: vi.fn().mockResolvedValue('ok') },
        },
        {
          provide: LifecycleService,
          useValue: {
            createLifecycle: vi.fn().mockResolvedValue({ id: 'lifecycle-1' }),
          },
        },
        {
          provide: ActorService,
          useValue: {
            hasValidCredential: vi.fn().mockResolvedValue(false),
            grantCredentialOrFail: vi.fn().mockResolvedValue(undefined),
          },
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
    // The invitee credential of a Space role set is derived from its Space.
    vi.spyOn(
      module.get(RoleSetService) as any,
      'getCredentialSpaceImplicitRole'
    ).mockResolvedValue({
      type: AuthorizationCredential.SPACE_MEMBER_INVITEE,
      resourceID: SPACE_ID,
    });
  });

  it('never persists an invitation or platform invitation whose policy has no credential rules', async () => {
    await invite();

    expect(store.of('invitation')).toHaveLength(1);
    expect(store.of('platformInvitation')).toHaveLength(1);
    for (const write of store.writes) {
      expect(write.policy.credentialRules.length).toBeGreaterThan(0);
    }
  });

  it('leaves the new invitations readable when an application on the role set cannot have its policy applied', async () => {
    // An application on the same role set, with a healthy policy…
    store.rows.set(SIBLING_APPLICATION_ID, {
      kind: 'application',
      id: SIBLING_APPLICATION_ID,
      roleSetID: ROLE_SET_ID,
      fields: { userID: 'other-user', lifecycle: { id: 'lifecycle-sibling' } },
      policy: {
        id: 'sibling-policy',
        type: AuthorizationPolicyType.APPLICATION,
        credentialRules: roleSetPolicy().credentialRules,
      },
    });
    // …that is deleted (withdrawn, or its user removed) after a role-set-wide
    // pass has read the role set's children but before it reaches it.
    store.afterRoleSetChildrenLoaded = () => {
      store.rows.delete(SIBLING_APPLICATION_ID);
    };

    // Whether the mutation itself reports the sibling is not the point: what
    // must hold is the state it leaves behind.
    await invite().catch(() => undefined);

    const platformInvitation = theOnly('platformInvitation');
    expect(platformInvitation.fields.email).toBe(EXTERNAL_EMAIL);
    expectReadable(platformInvitation, 'lookup Platform Invitation');

    const invitation = theOnly('invitation');
    expectReadable(invitation, 'lookup Invitation');
    // and the invitee's account admins can read and accept it
    expect(invitation.policy.credentialRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          criterias: [
            {
              type: AuthorizationCredential.ACCOUNT_ADMIN,
              resourceID: INVITEE_ACCOUNT_ID,
            },
          ],
        }),
      ])
    );
  });
});
