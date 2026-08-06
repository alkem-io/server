import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import {
  Inject,
  Injectable,
  LoggerService,
  NotImplementedException,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IPlatformAccessRole } from './platform.roles.access.role.interface';

/**
 * The SINGLE canonical role→credential map for the platform role-set
 * (research D3, FR-011/SC-008). Every consumer that needs to resolve a
 * platform `RoleName` to its `AuthorizationCredential` MUST read through
 * this map rather than maintaining its own switch/lookup — a second lookup
 * is exactly how the C1 silent-void defect arose (`global-spaces-reader` /
 * `global-community-reader` seeded rows naming a credential no check reads).
 *
 * `role.credential.map.spec.ts` is the FR-011 anti-drift guard: for every
 * platform-role-set `RoleName` it asserts (a) an entry exists here, (b) the
 * entry's value string equals the `RoleName` value string (identical
 * identifiers — research D2), and (c) the seed migration's
 * `createPlatformRoles()` contains a matching row.
 */
export const ROLE_CREDENTIAL_MAP: Record<RoleName, AuthorizationCredential> = {
  [RoleName.MEMBER]: AuthorizationCredential.SPACE_MEMBER,
  [RoleName.LEAD]: AuthorizationCredential.SPACE_LEAD,
  [RoleName.ADMIN]: AuthorizationCredential.SPACE_ADMIN,
  [RoleName.ASSOCIATE]: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
  [RoleName.OWNER]: AuthorizationCredential.ORGANIZATION_OWNER,
  [RoleName.PLATFORM_OPERATIONS_ADMIN]:
    AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN,
  // --- 027-platform-role-redesign: target role model (identical strings, D2) ---
  // T077 (Slice B): the ten legacy rows are gone with their enum members. The
  // two C1 defect rows went with them — `global-spaces-reader` and
  // `global-community-reader` mapped to credential strings the seed never
  // stored, which is the silent void this feature exists to close. Nothing maps
  // to a retired credential any more, so `role.credential.map.spec.ts`'s
  // FR-011 anti-drift assertion is satisfied by construction.
  [RoleName.PLATFORM_ROLES_ADMIN]: AuthorizationCredential.PLATFORM_ROLES_ADMIN,
  [RoleName.PLATFORM_CONTENT_FULL_ACCESS]:
    AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
  [RoleName.PLATFORM_RESOURCE_ADMIN]:
    AuthorizationCredential.PLATFORM_RESOURCE_ADMIN,
  [RoleName.PLATFORM_SETTINGS_ADMIN]:
    AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
  [RoleName.PLATFORM_USERS_ADMIN]: AuthorizationCredential.PLATFORM_USERS_ADMIN,
  [RoleName.PLATFORM_SUPPORT]: AuthorizationCredential.PLATFORM_SUPPORT,
  [RoleName.PLATFORM_LICENSE_MANAGER]:
    AuthorizationCredential.PLATFORM_LICENSE_MANAGER,
  [RoleName.PLATFORM_SPACES_READER]:
    AuthorizationCredential.PLATFORM_SPACES_READER,
  [RoleName.PLATFORM_AUDIT_READER]:
    AuthorizationCredential.PLATFORM_AUDIT_READER,
  [RoleName.FEATURE_BETA_TESTER]: AuthorizationCredential.FEATURE_BETA_TESTER,
  [RoleName.FEATURE_VIRTUAL_ASSISTANT]:
    AuthorizationCredential.FEATURE_VIRTUAL_ASSISTANT,
  [RoleName.FEATURE_ORGANIZATION_CREATOR]:
    AuthorizationCredential.FEATURE_ORGANIZATION_CREATOR,
  [RoleName.REGISTERED]: AuthorizationCredential.GLOBAL_REGISTERED,
  [RoleName.GUEST]: AuthorizationCredential.GLOBAL_GUEST,
  [RoleName.ANONYMOUS]: AuthorizationCredential.GLOBAL_ANONYMOUS,
};

/**
 * ROLE_CREDENTIAL_MAP above is keyed by `RoleName` ALONE, which is correct for
 * the platform role-set (its role names are globally unique) but NOT for the
 * role names shared between role-set types. `RoleName.ADMIN` is the one
 * real collision in the model: a SPACE role-set's ADMIN is `space-admin`, an
 * ORGANIZATION role-set's ADMIN is `organization-admin`
 * (organization.role.definitions.ts). Every other shared name is unambiguous —
 * MEMBER/LEAD are space-only, ASSOCIATE/OWNER organization-only.
 *
 * This override restores the role-set dimension that the flat map cannot carry.
 * Without it, `RoleSetService.getCredentialForRole` resolves an ORGANIZATION
 * ADMIN to `space-admin`, so promoting an organization admin writes the wrong
 * credential type — which silently breaks organization-admin authorization AND
 * the FR-002/FR-031 feature-role inheritance that filters for
 * `organization-admin`/`organization-owner`. Live-confirmed 2026-07-29 by
 * immediacy.it-spec.ts and org-inheritance-demotion.it-spec.ts.
 */
export const ROLE_CREDENTIAL_OVERRIDES_BY_ROLE_SET_TYPE: Partial<
  Record<RoleSetType, Partial<Record<RoleName, AuthorizationCredential>>>
> = {
  [RoleSetType.ORGANIZATION]: {
    [RoleName.ADMIN]: AuthorizationCredential.ORGANIZATION_ADMIN,
  },
};

/**
 * The canonical resolver. Prefer this over indexing ROLE_CREDENTIAL_MAP
 * directly wherever a role-set is in hand; the bare map remains correct for
 * platform-role-set lookups, where no override exists.
 */
export const resolveRoleCredential = (
  roleName: RoleName,
  roleSetType?: RoleSetType
): AuthorizationCredential =>
  (roleSetType &&
    ROLE_CREDENTIAL_OVERRIDES_BY_ROLE_SET_TYPE[roleSetType]?.[roleName]) ||
  ROLE_CREDENTIAL_MAP[roleName];

@Injectable()
export class PlatformRolesAccessService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  private getRolesWithPrivileges(
    platformAccessRoles: IPlatformAccessRole[],
    allowedPrivileges: AuthorizationPrivilege[]
  ): RoleName[] {
    const rolesWithAccess: RoleName[] = [];
    for (const platformAccessRole of platformAccessRoles) {
      const rolePrivileges = platformAccessRole.grantedPrivileges.filter(
        privilege => allowedPrivileges.includes(privilege)
      );

      if (rolePrivileges.length > 0) {
        rolesWithAccess.push(platformAccessRole.roleName);
      }
    }
    return rolesWithAccess;
  }

  public getCredentialsForRolesWithAccess(
    platformAccessRoles: IPlatformAccessRole[],
    allowedPrivileges: AuthorizationPrivilege[]
  ): ICredentialDefinition[] {
    // Get the roles with access based on the allowed privileges
    const rolesWithAccess = this.getRolesWithPrivileges(
      platformAccessRoles,
      allowedPrivileges
    );

    // Get the credentials for the roles with access
    const credentials: ICredentialDefinition[] = [];
    for (const roleName of rolesWithAccess) {
      const credential = this.getCredentialForRole(roleName);

      credentials.push({
        type: credential,
        resourceID: '',
      });
    }

    return credentials;
  }

  public getPrivilegesForRole(
    platformAccessRoles: IPlatformAccessRole[],
    roleName: RoleName
  ): AuthorizationPrivilege[] {
    const role = platformAccessRoles.find(role => role.roleName === roleName);
    if (!role) {
      return [];
    }
    return role.grantedPrivileges;
  }

  public hasRolePrivilege(
    platformAccessRoles: IPlatformAccessRole[],
    roleName: RoleName,
    privilege: AuthorizationPrivilege
  ): boolean {
    const privileges = this.getPrivilegesForRole(platformAccessRoles, roleName);
    if (privileges.includes(privilege)) {
      return true;
    }
    return false;
  }

  // 027-platform-role-redesign (research C1/D3): resolve through the single
  // canonical ROLE_CREDENTIAL_MAP rather than a locally-maintained switch —
  // a second lookup that can silently disagree with the first is exactly the
  // C1 defect class this feature exists to close.
  private getCredentialForRole(roleName: RoleName): AuthorizationCredential {
    const credential = ROLE_CREDENTIAL_MAP[roleName];
    if (!credential) {
      throw new NotImplementedException(`Invalid role name: ${roleName}`);
    }
    return credential;
  }
}
