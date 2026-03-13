import { AuthorizationPrivilege } from '@common/enums';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceSortMode } from '@common/enums/space.sort.mode';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { ISpace } from './space.interface';
import { SpacePlatformRolesAccessService } from './space.service.platform.roles.access';

describe('SpacePlatformRolesAccessService', () => {
  let service: SpacePlatformRolesAccessService;
  let platformAccessService: PlatformRolesAccessService;

  const defaultSettings: ISpaceSettings = {
    privacy: {
      mode: SpacePrivacyMode.PUBLIC,
      allowPlatformSupportAsAdmin: false,
    },
    membership: {
      policy: CommunityMembershipPolicy.OPEN,
      trustedOrganizations: [],
      allowSubspaceAdminsToInviteMembers: false,
    },
    collaboration: {
      inheritMembershipRights: true,
      allowMembersToCreateSubspaces: true,
      allowMembersToCreateCallouts: true,
      allowEventsFromSubspaces: true,
      allowMembersToVideoCall: false,
      allowGuestContributions: false,
    },
    sortMode: SpaceSortMode.ALPHABETICAL,
  };

  const createSpace = (overrides: Partial<ISpace> = {}): ISpace =>
    ({
      id: 'space-1',
      level: SpaceLevel.L0,
      visibility: SpaceVisibility.ACTIVE,
      settings: defaultSettings,
      ...overrides,
    }) as ISpace;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SpacePlatformRolesAccessService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpacePlatformRolesAccessService);
    platformAccessService = module.get(PlatformRolesAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlatformRolesAccess', () => {
    describe('L0 spaces', () => {
      it('should create roles for a public L0 space', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        expect(result.roles).toBeDefined();
        expect(result.roles.length).toBe(7);

        const roleNames = result.roles.map(r => r.roleName);
        expect(roleNames).toContain(RoleName.ANONYMOUS);
        expect(roleNames).toContain(RoleName.GUEST);
        expect(roleNames).toContain(RoleName.REGISTERED);
        expect(roleNames).toContain(RoleName.GLOBAL_ADMIN);
        expect(roleNames).toContain(RoleName.GLOBAL_LICENSE_MANAGER);
        expect(roleNames).toContain(RoleName.GLOBAL_SUPPORT);
        expect(roleNames).toContain(RoleName.GLOBAL_SPACES_READER);
      });

      it('should grant READ to anonymous users on public L0 space', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const anonRole = result.roles.find(
          r => r.roleName === RoleName.ANONYMOUS
        );
        expect(anonRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ
        );
        expect(anonRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ_ABOUT
        );
      });

      it('should NOT grant READ to anonymous users on private L0 space', () => {
        const privateSettings = {
          ...defaultSettings,
          privacy: {
            ...defaultSettings.privacy,
            mode: SpacePrivacyMode.PRIVATE,
          },
        };
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          privateSettings
        );

        const anonRole = result.roles.find(
          r => r.roleName === RoleName.ANONYMOUS
        );
        expect(anonRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ_ABOUT
        );
        expect(anonRole?.grantedPrivileges).not.toContain(
          AuthorizationPrivilege.READ
        );
      });

      it('should return empty privileges for anonymous on archived L0 space', () => {
        const space = createSpace({ visibility: SpaceVisibility.ARCHIVED });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const anonRole = result.roles.find(
          r => r.roleName === RoleName.ANONYMOUS
        );
        expect(anonRole?.grantedPrivileges).toEqual([]);
      });

      it('should return empty privileges for guest on archived L0 space', () => {
        const space = createSpace({ visibility: SpaceVisibility.ARCHIVED });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const guestRole = result.roles.find(r => r.roleName === RoleName.GUEST);
        expect(guestRole?.grantedPrivileges).toEqual([]);
      });

      it('should return empty privileges for registered users on archived L0 space', () => {
        const space = createSpace({ visibility: SpaceVisibility.ARCHIVED });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const regRole = result.roles.find(
          r => r.roleName === RoleName.REGISTERED
        );
        expect(regRole?.grantedPrivileges).toEqual([]);
      });

      it('should grant CRUD+GRANT to global admin', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const adminRole = result.roles.find(
          r => r.roleName === RoleName.GLOBAL_ADMIN
        );
        expect(adminRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.CREATE
        );
        expect(adminRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ
        );
        expect(adminRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.UPDATE
        );
        expect(adminRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.DELETE
        );
        expect(adminRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.GRANT
        );
      });

      it('should grant READ_LICENSE and READ_ABOUT to license managers on L0', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const licenseRole = result.roles.find(
          r => r.roleName === RoleName.GLOBAL_LICENSE_MANAGER
        );
        expect(licenseRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ_LICENSE
        );
        expect(licenseRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ_ABOUT
        );
      });

      it('should grant READ to GLOBAL_SPACES_READER', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const readerRole = result.roles.find(
          r => r.roleName === RoleName.GLOBAL_SPACES_READER
        );
        expect(readerRole?.grantedPrivileges).toEqual([
          AuthorizationPrivilege.READ,
        ]);
      });

      it('should grant support basic privileges on L0', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const supportRole = result.roles.find(
          r => r.roleName === RoleName.GLOBAL_SUPPORT
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ_LICENSE
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ_ABOUT
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.PLATFORM_ADMIN
        );
      });

      it('should grant support CRUD when allowPlatformSupportAsAdmin is true', () => {
        const supportSettings = {
          ...defaultSettings,
          privacy: {
            ...defaultSettings.privacy,
            allowPlatformSupportAsAdmin: true,
          },
        };
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          supportSettings
        );

        const supportRole = result.roles.find(
          r => r.roleName === RoleName.GLOBAL_SUPPORT
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.CREATE
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.UPDATE
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.DELETE
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.GRANT
        );
      });

      it('should grant PUBLIC_SHARE to support when both allowPlatformSupportAsAdmin and allowGuestContributions are true', () => {
        const settings = {
          ...defaultSettings,
          privacy: {
            ...defaultSettings.privacy,
            allowPlatformSupportAsAdmin: true,
          },
          collaboration: {
            ...defaultSettings.collaboration,
            allowGuestContributions: true,
          },
        };
        const space = createSpace();
        const result = service.createPlatformRolesAccess(space, settings);

        const supportRole = result.roles.find(
          r => r.roleName === RoleName.GLOBAL_SUPPORT
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.PUBLIC_SHARE
        );
      });

      it('should grant guest READ_USERS on public L0 space', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const guestRole = result.roles.find(r => r.roleName === RoleName.GUEST);
        expect(guestRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ_USERS
        );
      });

      it('should NOT grant license manager privileges on non-L0 space', () => {
        const parentAccess: IPlatformRolesAccess = { roles: [] };
        const space = createSpace({ level: SpaceLevel.L1 });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings,
          parentAccess
        );

        const licenseRole = result.roles.find(
          r => r.roleName === RoleName.GLOBAL_LICENSE_MANAGER
        );
        expect(licenseRole?.grantedPrivileges).toEqual([]);
      });
    });

    describe('Subspaces (L1/L2)', () => {
      it('should throw when subspace has no parent platform access', () => {
        const space = createSpace({ level: SpaceLevel.L1 });

        expect(() =>
          service.createPlatformRolesAccess(space, defaultSettings)
        ).toThrow(RelationshipNotFoundException);
      });

      it('should grant anonymous READ when parent has READ for anonymous', () => {
        const parentAccess: IPlatformRolesAccess = {
          roles: [
            {
              roleName: RoleName.ANONYMOUS,
              grantedPrivileges: [AuthorizationPrivilege.READ],
            },
          ],
        };
        (platformAccessService.hasRolePrivilege as any).mockReturnValue(true);
        const space = createSpace({ level: SpaceLevel.L1 });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings,
          parentAccess
        );

        const anonRole = result.roles.find(
          r => r.roleName === RoleName.ANONYMOUS
        );
        expect(anonRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ
        );
        expect(anonRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ_ABOUT
        );
      });

      it('should NOT grant anonymous READ when parent lacks READ for anonymous', () => {
        const parentAccess: IPlatformRolesAccess = {
          roles: [
            {
              roleName: RoleName.ANONYMOUS,
              grantedPrivileges: [AuthorizationPrivilege.READ_ABOUT],
            },
          ],
        };
        (platformAccessService.hasRolePrivilege as any).mockReturnValue(false);
        const space = createSpace({ level: SpaceLevel.L1 });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings,
          parentAccess
        );

        const anonRole = result.roles.find(
          r => r.roleName === RoleName.ANONYMOUS
        );
        expect(anonRole?.grantedPrivileges).toEqual([]);
      });

      it('should grant support CRUD when parent has UPDATE for support', () => {
        const parentAccess: IPlatformRolesAccess = {
          roles: [
            {
              roleName: RoleName.GLOBAL_SUPPORT,
              grantedPrivileges: [AuthorizationPrivilege.UPDATE],
            },
          ],
        };
        (platformAccessService.hasRolePrivilege as any).mockReturnValue(true);
        const space = createSpace({ level: SpaceLevel.L1 });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings,
          parentAccess
        );

        const supportRole = result.roles.find(
          r => r.roleName === RoleName.GLOBAL_SUPPORT
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.CREATE
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.UPDATE
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.DELETE
        );
        expect(supportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.GRANT
        );
      });

      it('should NOT grant support CRUD when parent lacks UPDATE for support', () => {
        const parentAccess: IPlatformRolesAccess = {
          roles: [
            {
              roleName: RoleName.GLOBAL_SUPPORT,
              grantedPrivileges: [AuthorizationPrivilege.READ],
            },
          ],
        };
        (platformAccessService.hasRolePrivilege as any).mockReturnValue(false);
        const space = createSpace({ level: SpaceLevel.L1 });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings,
          parentAccess
        );

        const supportRole = result.roles.find(
          r => r.roleName === RoleName.GLOBAL_SUPPORT
        );
        expect(supportRole?.grantedPrivileges).toEqual([]);
      });

      it('should throw EntityNotFoundException for support on subspace without parent access', () => {
        // Create a space that has level > L0 but pass undefined parent access
        // The service should throw on the ANONYMOUS check first since we check all roles
        const space = createSpace({ level: SpaceLevel.L1 });

        expect(() =>
          service.createPlatformRolesAccess(space, defaultSettings, undefined)
        ).toThrow(RelationshipNotFoundException);
      });

      it('should NOT grant guest READ_ABOUT on private subspace without parent READ', () => {
        const privateSettings = {
          ...defaultSettings,
          privacy: {
            ...defaultSettings.privacy,
            mode: SpacePrivacyMode.PRIVATE,
          },
        };
        const parentAccess: IPlatformRolesAccess = {
          roles: [],
        };
        (platformAccessService.hasRolePrivilege as any).mockReturnValue(false);
        const space = createSpace({ level: SpaceLevel.L1 });
        const result = service.createPlatformRolesAccess(
          space,
          privateSettings,
          parentAccess
        );

        const guestRole = result.roles.find(r => r.roleName === RoleName.GUEST);
        expect(guestRole?.grantedPrivileges).toEqual([]);
      });

      it('should grant registered user READ_ABOUT and READ on public subspace with parent READ', () => {
        const parentAccess: IPlatformRolesAccess = {
          roles: [
            {
              roleName: RoleName.REGISTERED,
              grantedPrivileges: [AuthorizationPrivilege.READ],
            },
          ],
        };
        (platformAccessService.hasRolePrivilege as any).mockReturnValue(true);
        const space = createSpace({ level: SpaceLevel.L1 });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings,
          parentAccess
        );

        const regRole = result.roles.find(
          r => r.roleName === RoleName.REGISTERED
        );
        expect(regRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ_ABOUT
        );
        expect(regRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.READ
        );
      });
    });
  });
});
