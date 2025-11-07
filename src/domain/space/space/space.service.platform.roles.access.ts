import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ISpace } from './space.interface';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { IPlatformAccessRole } from '@domain/access/platform-roles-access/platform.roles.access.role.interface';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { SpaceVisibility } from '@common/enums/space.visibility';

@Injectable()
export class SpacePlatformRolesAccessService {
  constructor(
    private platformAccessService: PlatformRolesAccessService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createPlatformRolesAccess(
    space: ISpace,
    spaceSettings: ISpaceSettings,
    parentPlatformAccess?: IPlatformRolesAccess
  ): IPlatformRolesAccess {
    const platformAccessRoles: IPlatformAccessRole[] = [];
    if (space.level !== SpaceLevel.L0 && !parentPlatformAccess) {
      throw new RelationshipNotFoundException(
        `Parent platform access not found for space ${space.id}`,
        LogContext.SPACES
      );
    }

    platformAccessRoles.push({
      roleName: RoleName.ANONYMOUS,
      grantedPrivileges: this.getAccessPrivilegesForAnonymousUsers(
        space,
        spaceSettings,
        parentPlatformAccess
      ),
    });

    platformAccessRoles.push({
      roleName: RoleName.REGISTERED,
      grantedPrivileges: this.getAccessPrivilegesForRegisteredUsers(
        space,
        spaceSettings,
        parentPlatformAccess
      ),
    });

    platformAccessRoles.push({
      roleName: RoleName.GLOBAL_ADMIN,
      grantedPrivileges: this.getAccessPrivilegesForGlobalAdmin(),
    });

    platformAccessRoles.push({
      roleName: RoleName.GLOBAL_LICENSE_MANAGER,
      grantedPrivileges: this.getAccessPrivilegesForLicenseManagers(space),
    });

    platformAccessRoles.push({
      roleName: RoleName.GLOBAL_SUPPORT,
      grantedPrivileges: this.getAccessPrivilegesForSupport(
        space,
        spaceSettings,
        parentPlatformAccess
      ),
    });

    platformAccessRoles.push({
      roleName: RoleName.GLOBAL_SPACES_READER,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    });

    return { roles: platformAccessRoles };
  }

  private getAccessPrivilegesForSupport(
    space: ISpace,
    spaceSettings: ISpaceSettings,
    parentPlatformAccess?: IPlatformRolesAccess
  ): AuthorizationPrivilege[] {
    const privileges: AuthorizationPrivilege[] = [];

    if (space.level === SpaceLevel.L0) {
      privileges.push(
        AuthorizationPrivilege.READ_LICENSE,
        AuthorizationPrivilege.READ_ABOUT,
        AuthorizationPrivilege.PLATFORM_ADMIN
      );

      // Setting only valid on L0 spaces
      if (spaceSettings.privacy.allowPlatformSupportAsAdmin) {
        privileges.push(
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT
        );

        // This privilege is granted on all admins of space with setting enabled
        if (spaceSettings.collaboration?.allowGuestContributions) {
          privileges.push(AuthorizationPrivilege.PUBLIC_SHARE);
        }
      }
    } else {
      if (!parentPlatformAccess) {
        throw new EntityNotFoundException(
          `Support access: Parent platform access not found for space ${space.id}`,
          LogContext.SPACES
        );
      }
      const hasUpdateOnParent = this.platformAccessService.hasRolePrivilege(
        parentPlatformAccess.roles,
        RoleName.GLOBAL_SUPPORT,
        AuthorizationPrivilege.UPDATE
      );
      if (hasUpdateOnParent) {
        privileges.push(
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT
        );
      }
    }

    return privileges;
  }

  private getAccessPrivilegesForGlobalAdmin(): AuthorizationPrivilege[] {
    return [
      AuthorizationPrivilege.CREATE,
      AuthorizationPrivilege.READ,
      AuthorizationPrivilege.UPDATE,
      AuthorizationPrivilege.DELETE,
      AuthorizationPrivilege.GRANT,
    ];
  }

  private getAccessPrivilegesForLicenseManagers(
    space: ISpace
  ): AuthorizationPrivilege[] {
    const privileges: AuthorizationPrivilege[] = [];

    if (space.level === SpaceLevel.L0) {
      privileges.push(
        AuthorizationPrivilege.READ_LICENSE,
        AuthorizationPrivilege.READ_ABOUT
      );
    }

    return privileges;
  }

  private getAccessPrivilegesForAnonymousUsers(
    space: ISpace,
    spaceSettings: ISpaceSettings,
    parentPlatformAccess?: IPlatformRolesAccess
  ): AuthorizationPrivilege[] {
    const privileges: AuthorizationPrivilege[] = [];
    if (space.visibility === SpaceVisibility.ARCHIVED) {
      return privileges; // No access for anonymous users on archived spaces
    }

    if (space.level === SpaceLevel.L0) {
      privileges.push(AuthorizationPrivilege.READ_ABOUT);
      if (spaceSettings.privacy.mode === SpacePrivacyMode.PUBLIC) {
        privileges.push(AuthorizationPrivilege.READ);
      }
    } else {
      if (!parentPlatformAccess) {
        throw new EntityNotFoundException(
          `Anonymous users: Parent platform access not found for space ${space.id}`,
          LogContext.SPACES
        );
      }
      const hasReadOnParent = this.platformAccessService.hasRolePrivilege(
        parentPlatformAccess.roles,
        RoleName.ANONYMOUS,
        AuthorizationPrivilege.READ
      );
      if (hasReadOnParent) {
        privileges.push(AuthorizationPrivilege.READ_ABOUT);
        if (spaceSettings.privacy.mode === SpacePrivacyMode.PUBLIC) {
          privileges.push(AuthorizationPrivilege.READ);
        }
      }
    }

    return privileges;
  }

  private getAccessPrivilegesForRegisteredUsers(
    space: ISpace,
    spaceSettings: ISpaceSettings,
    parentPlatformAccess?: IPlatformRolesAccess
  ): AuthorizationPrivilege[] {
    const privileges: AuthorizationPrivilege[] = [];
    if (space.visibility === SpaceVisibility.ARCHIVED) {
      return privileges; // No access for registered users on archived spaces
    }

    if (space.level === SpaceLevel.L0) {
      privileges.push(AuthorizationPrivilege.READ_ABOUT);
      if (spaceSettings.privacy.mode === SpacePrivacyMode.PUBLIC) {
        privileges.push(AuthorizationPrivilege.READ);
      }
    } else {
      if (!parentPlatformAccess) {
        throw new EntityNotFoundException(
          `Registered users: Parent platform access not found for space ${space.id}`,
          LogContext.SPACES
        );
      }
      const hasReadOnParent = this.platformAccessService.hasRolePrivilege(
        parentPlatformAccess.roles,
        RoleName.REGISTERED,
        AuthorizationPrivilege.READ
      );
      if (hasReadOnParent) {
        privileges.push(AuthorizationPrivilege.READ_ABOUT);
        if (spaceSettings.privacy.mode === SpacePrivacyMode.PUBLIC) {
          privileges.push(AuthorizationPrivilege.READ);
        }
      }
    }

    return privileges;
  }
}
