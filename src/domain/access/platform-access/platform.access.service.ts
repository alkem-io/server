import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IPlatformAccessRole } from './platform.access.role.interface';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { RoleName } from '@common/enums/role.name';
import { PlatformService } from '@platform/platform/platform.service';
import { RoleSetService } from '../role-set/role.set.service';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class PlatformAccessService {
  constructor(
    private readonly platformService: PlatformService,
    private readonly roleSetService: RoleSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getCredentialsForRolesWithPrivileges(
    platformAccessRoles: IPlatformAccessRole[],
    allowedPrivileges: AuthorizationPrivilege[]
  ): Promise<ICredentialDefinition[]> {
    const credentials: ICredentialDefinition[] = [];

    const rolesWithAccess: RoleName[] = [];
    for (const platformAccessRole of platformAccessRoles) {
      const rolePrivileges = platformAccessRole.grantedPrivileges.filter(
        privilege => allowedPrivileges.includes(privilege)
      );

      if (rolePrivileges.length > 0) {
        rolesWithAccess.push(platformAccessRole.roleName);
      }
    }

    // Get the credentials for the roles with access
    const roleSet = await this.platformService.getRoleSetOrFail();
    for (const roleName of rolesWithAccess) {
      const roleDefinition =
        await this.roleSetService.getCredentialDefinitionForRole(
          roleSet,
          roleName
        );
      if (!roleDefinition) {
        throw new RelationshipNotFoundException(
          `No credential definition found for role: ${roleName} in RoleSet: ${roleSet.id}`,
          LogContext.AUTH_POLICY
        );
      }
      credentials.push({
        type: roleDefinition.type,
        resourceID: '',
      } as ICredentialDefinition);
    }

    return credentials;
  }
}
