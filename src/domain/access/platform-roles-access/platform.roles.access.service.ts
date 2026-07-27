import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
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
  [RoleName.GLOBAL_ADMIN]: AuthorizationCredential.GLOBAL_ADMIN,
  [RoleName.GLOBAL_SUPPORT]: AuthorizationCredential.GLOBAL_SUPPORT,
  [RoleName.GLOBAL_LICENSE_MANAGER]:
    AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
  [RoleName.GLOBAL_COMMUNITY_READER]:
    AuthorizationCredential.GLOBAL_COMMUNITY_READ,
  [RoleName.GLOBAL_SPACES_READER]: AuthorizationCredential.GLOBAL_SPACES_READER,
  [RoleName.GLOBAL_PLATFORM_MANAGER]:
    AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
  [RoleName.GLOBAL_SUPPORT_MANAGER]:
    AuthorizationCredential.GLOBAL_SUPPORT_MANAGER,
  [RoleName.PLATFORM_OPERATIONS_ADMIN]:
    AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN,
  [RoleName.PLATFORM_BETA_TESTER]: AuthorizationCredential.BETA_TESTER,
  [RoleName.PLATFORM_VC_CAMPAIGN]: AuthorizationCredential.VC_CAMPAIGN,
  [RoleName.PLATFORM_ASSISTANT_ACCESS]:
    AuthorizationCredential.ASSISTANT_ACCESS,
  // --- 027-platform-role-redesign: target role model (identical strings, D2) ---
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
