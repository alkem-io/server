import {
  AuthorizationCredential,
  AuthorizationPrivilege,
} from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { NotImplementedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IPlatformAccessRole } from './platform.roles.access.role.interface';
import { PlatformRolesAccessService } from './platform.roles.access.service';

describe('PlatformRolesAccessService', () => {
  let service: PlatformRolesAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformRolesAccessService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<PlatformRolesAccessService>(
      PlatformRolesAccessService
    );
  });

  describe('getCredentialsForRolesWithAccess', () => {
    it('should return credentials for roles that have matching privileges', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.GLOBAL_ADMIN,
          grantedPrivileges: [
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
          ],
        },
        {
          roleName: RoleName.MEMBER,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      const result = service.getCredentialsForRolesWithAccess(
        platformAccessRoles,
        [AuthorizationPrivilege.UPDATE]
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(AuthorizationCredential.GLOBAL_ADMIN);
      expect(result[0].resourceID).toBe('');
    });

    it('should return credentials for multiple roles matching the privilege', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.GLOBAL_ADMIN,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
        {
          roleName: RoleName.GLOBAL_SUPPORT,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
        {
          roleName: RoleName.GLOBAL_LICENSE_MANAGER,
          grantedPrivileges: [AuthorizationPrivilege.UPDATE],
        },
      ];

      const result = service.getCredentialsForRolesWithAccess(
        platformAccessRoles,
        [AuthorizationPrivilege.READ]
      );

      expect(result).toHaveLength(2);
      const credentialTypes = result.map(c => c.type);
      expect(credentialTypes).toContain(AuthorizationCredential.GLOBAL_ADMIN);
      expect(credentialTypes).toContain(
        AuthorizationCredential.GLOBAL_SUPPORT
      );
    });

    it('should return empty array when no roles match the allowed privileges', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.GLOBAL_ADMIN,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      const result = service.getCredentialsForRolesWithAccess(
        platformAccessRoles,
        [AuthorizationPrivilege.DELETE]
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when there are no platform access roles', () => {
      const result = service.getCredentialsForRolesWithAccess([], [
        AuthorizationPrivilege.READ,
      ]);

      expect(result).toEqual([]);
    });

    it('should map all supported role names to their correct credentials', () => {
      const roleMappings: [RoleName, AuthorizationCredential][] = [
        [RoleName.GLOBAL_ADMIN, AuthorizationCredential.GLOBAL_ADMIN],
        [RoleName.GLOBAL_SUPPORT, AuthorizationCredential.GLOBAL_SUPPORT],
        [
          RoleName.GLOBAL_LICENSE_MANAGER,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        ],
        [
          RoleName.GLOBAL_PLATFORM_MANAGER,
          AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
        ],
        [
          RoleName.GLOBAL_SUPPORT_MANAGER,
          AuthorizationCredential.GLOBAL_SUPPORT_MANAGER,
        ],
        [
          RoleName.GLOBAL_COMMUNITY_READER,
          AuthorizationCredential.GLOBAL_COMMUNITY_READ,
        ],
        [
          RoleName.GLOBAL_SPACES_READER,
          AuthorizationCredential.GLOBAL_SPACES_READER,
        ],
        [
          RoleName.PLATFORM_BETA_TESTER,
          AuthorizationCredential.BETA_TESTER,
        ],
        [RoleName.PLATFORM_VC_CAMPAIGN, AuthorizationCredential.VC_CAMPAIGN],
        [RoleName.REGISTERED, AuthorizationCredential.GLOBAL_REGISTERED],
        [RoleName.GUEST, AuthorizationCredential.GLOBAL_GUEST],
        [RoleName.ANONYMOUS, AuthorizationCredential.GLOBAL_ANONYMOUS],
      ];

      for (const [roleName, expectedCredential] of roleMappings) {
        const platformAccessRoles: IPlatformAccessRole[] = [
          {
            roleName,
            grantedPrivileges: [AuthorizationPrivilege.READ],
          },
        ];

        const result = service.getCredentialsForRolesWithAccess(
          platformAccessRoles,
          [AuthorizationPrivilege.READ]
        );

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(expectedCredential);
      }
    });

    it('should throw NotImplementedException for unsupported role name', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.MEMBER,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      expect(() =>
        service.getCredentialsForRolesWithAccess(platformAccessRoles, [
          AuthorizationPrivilege.READ,
        ])
      ).toThrow(NotImplementedException);
    });
  });

  describe('getPrivilegesForRole', () => {
    it('should return privileges for an existing role', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.GLOBAL_ADMIN,
          grantedPrivileges: [
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
          ],
        },
      ];

      const result = service.getPrivilegesForRole(
        platformAccessRoles,
        RoleName.GLOBAL_ADMIN
      );

      expect(result).toEqual([
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ]);
    });

    it('should return empty array when the role is not found', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.GLOBAL_ADMIN,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      const result = service.getPrivilegesForRole(
        platformAccessRoles,
        RoleName.GLOBAL_SUPPORT
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when no roles are provided', () => {
      const result = service.getPrivilegesForRole([], RoleName.GLOBAL_ADMIN);

      expect(result).toEqual([]);
    });
  });

  describe('hasRolePrivilege', () => {
    it('should return true when the role has the requested privilege', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.GLOBAL_ADMIN,
          grantedPrivileges: [
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
          ],
        },
      ];

      const result = service.hasRolePrivilege(
        platformAccessRoles,
        RoleName.GLOBAL_ADMIN,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(true);
    });

    it('should return false when the role does not have the requested privilege', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.GLOBAL_ADMIN,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      const result = service.hasRolePrivilege(
        platformAccessRoles,
        RoleName.GLOBAL_ADMIN,
        AuthorizationPrivilege.DELETE
      );

      expect(result).toBe(false);
    });

    it('should return false when the role is not found in the access roles', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.GLOBAL_ADMIN,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      const result = service.hasRolePrivilege(
        platformAccessRoles,
        RoleName.GLOBAL_SUPPORT,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(false);
    });

    it('should return false when the access roles array is empty', () => {
      const result = service.hasRolePrivilege(
        [],
        RoleName.GLOBAL_ADMIN,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(false);
    });
  });
});
