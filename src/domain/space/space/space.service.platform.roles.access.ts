import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceVisibility } from '@common/enums/space.visibility';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { IPlatformAccessRole } from '@domain/access/platform-roles-access/platform.roles.access.role.interface';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { ISpace } from './space.interface';

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
      roleName: RoleName.GUEST,
      grantedPrivileges: this.getAccessPrivilegesForGuestUsers(
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

    // 027-platform-role-redesign (T076/T077) — the four legacy per-space role
    // entries are gone. Where each capability went:
    //
    //  - `global-admin`'s blanket CRUD+GRANT: nowhere here. Platform-wide
    //    content access is the root content rule's cascading CRUD to
    //    `platform-content-full-access` (FR-004), not a per-space grant.
    //  - `global-license-manager`: RE-ANCHORED onto `platform-license-manager`
    //    below, same privileges. It is not dropped, because A12/A14 (license
    //    usage, space visibility) are unexercisable if the owner cannot read a
    //    space's license.
    //  - `global-support`: replaced by the `platform-support` entry below
    //    (T049). Deliberately NOT carrying legacy Support's unconditional
    //    L0 `READ_LICENSE`/`READ_ABOUT` — spec row 7 bounds Support's reach by
    //    the per-space `allowPlatformSupportAsAdmin` flag, and an
    //    unconditional read is exactly the standing access that bound removes.
    //  - `global-spaces-read`: replaced by `platform-spaces-reader` below. It
    //    was the C1 void role — it named a credential string no check read.
    platformAccessRoles.push({
      roleName: RoleName.PLATFORM_LICENSE_MANAGER,
      grantedPrivileges: this.getAccessPrivilegesForLicenseManagers(space),
    });

    // 027-platform-role-redesign (T038, A16): platform-spaces-reader
    // replaces the void global-spaces-read (research C1).
    platformAccessRoles.push({
      roleName: RoleName.PLATFORM_SPACES_READER,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    });

    // 027-platform-role-redesign (T049, A15): platform-support's in-space
    // admin rights, gated by the SAME per-space `allowPlatformSupportAsAdmin`
    // flag as legacy global-support — the flag is the real gate; this role
    // is additive alongside it. Deliberately does NOT carry the legacy
    // PLATFORM_ADMIN privilege GLOBAL_SUPPORT still gets above — this is the
    // new role, and the point of the redesign is that it never holds the
    // catch-all.
    platformAccessRoles.push({
      roleName: RoleName.PLATFORM_SUPPORT,
      grantedPrivileges: this.getAccessPrivilegesForPlatformSupport(
        space,
        spaceSettings,
        parentPlatformAccess
      ),
    });

    return { roles: platformAccessRoles };
  }

  private getAccessPrivilegesForPlatformSupport(
    space: ISpace,
    spaceSettings: ISpaceSettings,
    parentPlatformAccess?: IPlatformRolesAccess
  ): AuthorizationPrivilege[] {
    const privileges: AuthorizationPrivilege[] = [];

    if (space.level === SpaceLevel.L0) {
      if (spaceSettings.privacy.allowPlatformSupportAsAdmin) {
        privileges.push(
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT
        );
        if (spaceSettings.collaboration?.allowGuestContributions) {
          privileges.push(AuthorizationPrivilege.PUBLIC_SHARE);
        }
      }
    } else {
      if (!parentPlatformAccess) {
        throw new EntityNotFoundException(
          `Platform Support access: Parent platform access not found for space ${space.id}`,
          LogContext.SPACES
        );
      }
      const hasUpdateOnParent = this.platformAccessService.hasRolePrivilege(
        parentPlatformAccess.roles,
        RoleName.PLATFORM_SUPPORT,
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

  private getAccessPrivilegesForGuestUsers(
    space: ISpace,
    spaceSettings: ISpaceSettings,
    parentPlatformAccess?: IPlatformRolesAccess
  ): AuthorizationPrivilege[] {
    const privileges: AuthorizationPrivilege[] = [];
    if (space.visibility === SpaceVisibility.ARCHIVED) {
      return privileges; // No access for guest users on archived spaces
    }

    if (space.level === SpaceLevel.L0) {
      privileges.push(AuthorizationPrivilege.READ_ABOUT);
      if (spaceSettings.privacy.mode === SpacePrivacyMode.PUBLIC) {
        privileges.push(AuthorizationPrivilege.READ);
        // Guest users might have limited participation rights
        privileges.push(AuthorizationPrivilege.READ_USERS);
      }
    } else {
      if (!parentPlatformAccess) {
        throw new EntityNotFoundException(
          `Guest users: Parent platform access not found for space ${space.id}`,
          LogContext.SPACES
        );
      }
      const hasReadOnParent = this.platformAccessService.hasRolePrivilege(
        parentPlatformAccess.roles,
        RoleName.GUEST,
        AuthorizationPrivilege.READ
      );
      if (hasReadOnParent) {
        privileges.push(AuthorizationPrivilege.READ_ABOUT);
        if (spaceSettings.privacy.mode === SpacePrivacyMode.PUBLIC) {
          privileges.push(AuthorizationPrivilege.READ);
          privileges.push(AuthorizationPrivilege.READ_USERS);
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
