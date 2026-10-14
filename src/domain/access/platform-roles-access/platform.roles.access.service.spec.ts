import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IPlatformAccessRole } from './platform.roles.access.role.interface';
import { PlatformRolesAccessService } from './platform.roles.access.service';

describe('PlatformRolesAccessService', () => {
  let service: PlatformRolesAccessService;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
          roleName: RoleName.PLATFORM_CONTENT_FULL_ACCESS,
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
      expect(result[0].type).toBe(
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
      );
      expect(result[0].resourceID).toBe('');
    });

    it('should return credentials for multiple roles matching the privilege', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.PLATFORM_CONTENT_FULL_ACCESS,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
        {
          roleName: RoleName.PLATFORM_SUPPORT,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
        {
          roleName: RoleName.PLATFORM_LICENSE_MANAGER,
          grantedPrivileges: [AuthorizationPrivilege.UPDATE],
        },
      ];

      const result = service.getCredentialsForRolesWithAccess(
        platformAccessRoles,
        [AuthorizationPrivilege.READ]
      );

      expect(result).toHaveLength(2);
      const credentialTypes = result.map(c => c.type);
      expect(credentialTypes).toContain(
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
      );
      expect(credentialTypes).toContain(
        AuthorizationCredential.PLATFORM_SUPPORT
      );
    });

    it('should return empty array when no roles match the allowed privileges', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.PLATFORM_CONTENT_FULL_ACCESS,
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
      const result = service.getCredentialsForRolesWithAccess(
        [],
        [AuthorizationPrivilege.READ]
      );

      expect(result).toEqual([]);
    });

    it('should map all supported role names to their correct credentials', () => {
      const roleMappings: [RoleName, AuthorizationCredential][] = [
        [
          RoleName.PLATFORM_CONTENT_FULL_ACCESS,
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
        ],
        [RoleName.PLATFORM_SUPPORT, AuthorizationCredential.PLATFORM_SUPPORT],
        [
          RoleName.FEATURE_BETA_TESTER,
          AuthorizationCredential.FEATURE_BETA_TESTER,
        ],
        [
          RoleName.FEATURE_ORGANIZATION_CREATOR,
          AuthorizationCredential.FEATURE_ORGANIZATION_CREATOR,
        ],
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

    // 027-platform-role-redesign (T009/T010, research D3): ROLE_CREDENTIAL_MAP
    // is now a TOTAL map over every RoleName, including the space/org-scoped
    // ones (MEMBER, LEAD, ...) that the old hand-written switch omitted —
    // that omission was the "hack to avoid loading up the platform roleset"
    // this feature's canonical map replaces. RoleName.MEMBER therefore no
    // longer throws; it resolves to its real credential, exactly like every
    // other role. There is no longer a RoleName value that can reach the
    // NotImplementedException branch through the public API (Record<RoleName,
    // ...> is exhaustive at the type level) — the branch remains only as a
    // defensive guard against a value bypassing the type system.
    it('resolves RoleName.MEMBER through the canonical map rather than throwing (superseded switch-based behaviour)', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.MEMBER,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      const result = service.getCredentialsForRolesWithAccess(
        platformAccessRoles,
        [AuthorizationPrivilege.READ]
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(AuthorizationCredential.SPACE_MEMBER);
    });
  });

  describe('getPrivilegesForRole', () => {
    it('should return privileges for an existing role', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.PLATFORM_CONTENT_FULL_ACCESS,
          grantedPrivileges: [
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
          ],
        },
      ];

      const result = service.getPrivilegesForRole(
        platformAccessRoles,
        RoleName.PLATFORM_CONTENT_FULL_ACCESS
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
          roleName: RoleName.PLATFORM_CONTENT_FULL_ACCESS,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      const result = service.getPrivilegesForRole(
        platformAccessRoles,
        RoleName.PLATFORM_SUPPORT
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when no roles are provided', () => {
      const result = service.getPrivilegesForRole(
        [],
        RoleName.PLATFORM_CONTENT_FULL_ACCESS
      );

      expect(result).toEqual([]);
    });
  });

  describe('hasRolePrivilege', () => {
    it('should return true when the role has the requested privilege', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.PLATFORM_CONTENT_FULL_ACCESS,
          grantedPrivileges: [
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
          ],
        },
      ];

      const result = service.hasRolePrivilege(
        platformAccessRoles,
        RoleName.PLATFORM_CONTENT_FULL_ACCESS,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(true);
    });

    it('should return false when the role does not have the requested privilege', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.PLATFORM_CONTENT_FULL_ACCESS,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      const result = service.hasRolePrivilege(
        platformAccessRoles,
        RoleName.PLATFORM_CONTENT_FULL_ACCESS,
        AuthorizationPrivilege.DELETE
      );

      expect(result).toBe(false);
    });

    it('should return false when the role is not found in the access roles', () => {
      const platformAccessRoles: IPlatformAccessRole[] = [
        {
          roleName: RoleName.PLATFORM_CONTENT_FULL_ACCESS,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ];

      // The role asked about is NOT the one in the fixture — that is the
      // point of this case, so it must stay a different member of the target
      // role model now that the legacy names are gone.
      const result = service.hasRolePrivilege(
        platformAccessRoles,
        RoleName.PLATFORM_SUPPORT,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(false);
    });

    it('should return false when the access roles array is empty', () => {
      const result = service.hasRolePrivilege(
        [],
        RoleName.PLATFORM_CONTENT_FULL_ACCESS,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(false);
    });
  });
});
