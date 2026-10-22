import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';

/**
 * Real-shaped authorization policies for the organization Community-tab
 * gates, evaluated by the REAL `AuthorizationService` — so a test asserting
 * "Support is denied X" fails if a rule ever grants Support X, rather than
 * restating a mock.
 *
 * Mirrors what an authorization reset stores on an organization role set:
 * the root Content Full Access cascade, the organization admin/owner cascade (GRANT/CREATE/UPDATE/DELETE), their
 * non-cascading ROLESET_ENTRY_ROLE_ASSIGN, the ASSIGN → INVITE privilege rule,
 * and Platform Support's two type-only rules (membership privilege cascading,
 * invite not cascading).
 */
export const ORG_ID = 'org-1';

const adminCriterias = [
  { type: AuthorizationCredential.ORGANIZATION_ADMIN, resourceID: ORG_ID },
  { type: AuthorizationCredential.ORGANIZATION_OWNER, resourceID: ORG_ID },
];

/** The root policy's Content Full Access rule, inherited (cascading) by
 * every organization and Space tree: blanket CREATE/READ/UPDATE/DELETE plus
 * its own privilege — but never GRANT, an entry privilege or the Support
 * membership privilege. */
const rootContentFullAccessRule = {
  name: 'root-content-full-access',
  grantedPrivileges: [
    AuthorizationPrivilege.CREATE,
    AuthorizationPrivilege.READ,
    AuthorizationPrivilege.UPDATE,
    AuthorizationPrivilege.DELETE,
    AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
  ],
  criterias: [
    {
      type: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
      resourceID: '',
    },
  ],
  cascade: true,
};

export const realAuthorizationService = (): AuthorizationService =>
  new AuthorizationService(MockWinstonProvider.useValue as any);

export const orgRoleSetPolicy = (
  opts: { withSupportRules?: boolean } = {}
): IAuthorizationPolicy =>
  ({
    id: 'auth-org-roleset',
    type: 'role-set',
    credentialRules: [
      rootContentFullAccessRule,
      {
        name: 'org-admin',
        grantedPrivileges: [
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        criterias: adminCriterias,
        cascade: true,
      },
      {
        name: 'org-registered-read',
        grantedPrivileges: [AuthorizationPrivilege.READ],
        criterias: [
          { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
        ],
        cascade: true,
      },
      {
        name: 'org-admin-entry-assign',
        grantedPrivileges: [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN],
        criterias: adminCriterias,
        cascade: false,
      },
      ...(opts.withSupportRules === false
        ? []
        : [
            {
              name: 'support-membership',
              grantedPrivileges: [
                AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_MEMBERSHIP,
              ],
              criterias: [
                {
                  type: AuthorizationCredential.PLATFORM_SUPPORT,
                  resourceID: '',
                },
              ],
              cascade: true,
            },
            {
              name: 'support-invite',
              grantedPrivileges: [
                AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE,
              ],
              criterias: [
                {
                  type: AuthorizationCredential.PLATFORM_SUPPORT,
                  resourceID: '',
                },
              ],
              cascade: false,
            },
          ]),
    ],
    privilegeRules: [
      {
        name: 'assign-implies-invite',
        sourcePrivilege: AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN,
        grantedPrivileges: [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE],
      },
    ],
  }) as unknown as IAuthorizationPolicy;

/** A child (invitation / platform invitation / application) policy: only the
 * cascading rules of the role set survive inheritance. */
export const orgChildPolicy = (
  opts: { withSupportRules?: boolean } = {}
): IAuthorizationPolicy => {
  const parent = orgRoleSetPolicy(opts);
  return {
    ...parent,
    id: 'auth-org-child',
    credentialRules: parent.credentialRules.filter(rule => rule.cascade),
    privilegeRules: [],
  } as IAuthorizationPolicy;
};

/** A Space role-set policy: its own admins hold GRANT and entry ASSIGN; no
 * rule mentions Platform Support's membership privilege. */
export const SPACE_ID = 'space-1';
export const spaceRoleSetPolicy = (): IAuthorizationPolicy =>
  ({
    id: 'auth-space-roleset',
    type: 'role-set',
    credentialRules: [
      rootContentFullAccessRule,
      {
        name: 'space-admin',
        grantedPrivileges: [
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN,
        ],
        criterias: [
          { type: AuthorizationCredential.SPACE_ADMIN, resourceID: SPACE_ID },
        ],
        cascade: true,
      },
    ],
    privilegeRules: [],
  }) as unknown as IAuthorizationPolicy;

const actor = (
  actorID: string,
  credentials: { type: AuthorizationCredential; resourceID?: string }[]
): ActorContext => {
  const ctx = new ActorContext();
  ctx.actorID = actorID;
  ctx.credentials = [
    { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
    // Every user holds self-management over their own record.
    { type: AuthorizationCredential.USER_SELF_MANAGEMENT, resourceID: actorID },
    ...credentials.map(c => ({ type: c.type, resourceID: c.resourceID ?? '' })),
  ];
  return ctx;
};

export const supportActor = (actorID = 'support-user'): ActorContext =>
  actor(actorID, [{ type: AuthorizationCredential.PLATFORM_SUPPORT }]);

export const orgAdminActor = (actorID = 'org-admin-user'): ActorContext =>
  actor(actorID, [
    { type: AuthorizationCredential.ORGANIZATION_ADMIN, resourceID: ORG_ID },
  ]);

export const adminAndSupportActor = (
  actorID = 'admin-support-user'
): ActorContext =>
  actor(actorID, [
    { type: AuthorizationCredential.ORGANIZATION_ADMIN, resourceID: ORG_ID },
    { type: AuthorizationCredential.PLATFORM_SUPPORT },
  ]);

export const contentFullAccessActor = (actorID = 'cfa-user'): ActorContext =>
  actor(actorID, [
    { type: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS },
  ]);

/** Content Full Access and Platform Support together: no mutual exclusion
 * forbids the pair. CFA supplies UPDATE through the root cascade but never
 * GRANT, so anything GRANT decides is admitted on the Support path only. */
export const contentFullAccessAndSupportActor = (
  actorID = 'cfa-support-user'
): ActorContext =>
  actor(actorID, [
    { type: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS },
    { type: AuthorizationCredential.PLATFORM_SUPPORT },
  ]);

export const registeredActor = (actorID = 'plain-user'): ActorContext =>
  actor(actorID, []);

export const spaceAdminActor = (actorID = 'space-admin-user'): ActorContext =>
  actor(actorID, [
    { type: AuthorizationCredential.SPACE_ADMIN, resourceID: SPACE_ID },
  ]);
