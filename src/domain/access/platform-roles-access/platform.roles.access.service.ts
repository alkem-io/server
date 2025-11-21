import {
  Inject,
  Injectable,
  LoggerService,
  NotImplementedException,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IPlatformAccessRole } from './platform.roles.access.role.interface';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { RoleName } from '@common/enums/role.name';

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

  // Bit of a hack to avoid having to load up the platform roleset all the time
  private getCredentialForRole(roleName: RoleName): AuthorizationCredential {
    switch (roleName) {
      case RoleName.GLOBAL_LICENSE_MANAGER:
        return AuthorizationCredential.GLOBAL_LICENSE_MANAGER;
      case RoleName.GLOBAL_ADMIN:
        return AuthorizationCredential.GLOBAL_ADMIN;
      case RoleName.GLOBAL_SUPPORT:
        return AuthorizationCredential.GLOBAL_SUPPORT;
      case RoleName.GLOBAL_PLATFORM_MANAGER:
        return AuthorizationCredential.GLOBAL_PLATFORM_MANAGER;
      case RoleName.GLOBAL_SUPPORT_MANAGER:
        return AuthorizationCredential.GLOBAL_SUPPORT_MANAGER;
      case RoleName.GLOBAL_COMMUNITY_READER:
        return AuthorizationCredential.GLOBAL_COMMUNITY_READ;
      case RoleName.GLOBAL_SPACES_READER:
        return AuthorizationCredential.GLOBAL_SPACES_READER;
      case RoleName.PLATFORM_BETA_TESTER:
        return AuthorizationCredential.BETA_TESTER;
      case RoleName.PLATFORM_VC_CAMPAIGN:
        return AuthorizationCredential.VC_CAMPAIGN;
      case RoleName.REGISTERED:
        return AuthorizationCredential.GLOBAL_REGISTERED;
      case RoleName.GUEST:
        return AuthorizationCredential.GLOBAL_GUEST;
      case RoleName.ANONYMOUS:
        return AuthorizationCredential.GLOBAL_ANONYMOUS;
      default:
        throw new NotImplementedException(`Invalid role name: ${roleName}`);
    }
  }
}
