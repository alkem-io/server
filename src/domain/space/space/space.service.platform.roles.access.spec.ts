import { AuthorizationPrivilege } from '@common/enums';
import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
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
    layout: {
      calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
    },
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
        // 027-platform-role-redesign (T076/T077, Slice B): the four legacy
        // per-space role entries are gone — `global-admin`,
        // `global-license-manager`, `global-support` and the void
        // `global-spaces-read` (research C1). Six remain: the three identity
        // tiers plus `platform-license-manager` (re-anchored from
        // `global-license-manager`, because A12/A14 are unexercisable if the
        // owner cannot read a space's license), `platform-spaces-reader` and
        // `platform-support`.
        //
        // `platform-content-full-access` is deliberately NOT here: its reach
        // over space content is the root content rule's cascade (FR-004), not a
        // per-space grant, so adding it would double-count.
        expect(result.roles.length).toBe(6);

        const roleNames = result.roles.map(r => r.roleName);
        expect(roleNames).toContain(RoleName.ANONYMOUS);
        expect(roleNames).toContain(RoleName.GUEST);
        expect(roleNames).toContain(RoleName.REGISTERED);
        expect(roleNames).toContain(RoleName.PLATFORM_LICENSE_MANAGER);
        expect(roleNames).toContain(RoleName.PLATFORM_SPACES_READER);
        expect(roleNames).toContain(RoleName.PLATFORM_SUPPORT);
        expect(roleNames).not.toContain(RoleName.PLATFORM_CONTENT_FULL_ACCESS);
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

      // 027-platform-role-redesign (T076, Slice B): REPLACED. This asserted
      // that `global-admin` held CRUD+GRANT as a per-space platform role. That
      // entry is deleted: platform-wide content access is the root content
      // rule's cascade to `platform-content-full-access` (FR-004), never a
      // per-space grant. Asserting the ABSENCE is the load-bearing half —
      // re-adding a blanket per-space CRUD entry for any role would restore the
      // god mode this feature exists to remove, one space at a time.
      it('grants no per-space CRUD+GRANT to any platform role — content reach is the root cascade', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const platformRoles = result.roles.filter(r =>
          r.roleName.startsWith('platform-')
        );
        expect(platformRoles.length).toBeGreaterThan(0);
        for (const role of platformRoles) {
          expect(role.grantedPrivileges).not.toContain(
            AuthorizationPrivilege.GRANT
          );
        }
      });

      it('should grant READ_LICENSE and READ_ABOUT to license managers on L0', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const licenseRole = result.roles.find(
          r => r.roleName === RoleName.PLATFORM_LICENSE_MANAGER
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
          r => r.roleName === RoleName.PLATFORM_SPACES_READER
        );
        expect(readerRole?.grantedPrivileges).toEqual([
          AuthorizationPrivilege.READ,
        ]);
      });

      // 027-platform-role-redesign (T076, Slice B): INVERTED, deliberately.
      // Legacy `global-support` held unconditional L0 `READ_LICENSE` +
      // `READ_ABOUT` regardless of the space's settings. `platform-support` does
      // NOT inherit that: spec §Target global role model row 7 bounds Support's
      // reach to spaces that set `allowPlatformSupportAsAdmin`, and standing
      // read access on every L0 space is exactly the standing access that bound
      // removes. With the flag off (defaultSettings), Support holds nothing.
      it('grants Platform Support NOTHING on an L0 space that has not enabled the support flag', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const supportRole = result.roles.find(
          r => r.roleName === RoleName.PLATFORM_SUPPORT
        );
        expect(supportRole).toBeDefined();
        expect(supportRole?.grantedPrivileges).toEqual([]);
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
          r => r.roleName === RoleName.PLATFORM_SUPPORT
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
          r => r.roleName === RoleName.PLATFORM_SUPPORT
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
          r => r.roleName === RoleName.PLATFORM_LICENSE_MANAGER
        );
        expect(licenseRole?.grantedPrivileges).toEqual([]);
      });

      // 027-platform-role-redesign (qual-server-3 fix) — PLATFORM_SUPPORT's
      // twin of the GLOBAL_SUPPORT cases directly above. In particular:
      // PLATFORM_ADMIN is asserted ABSENT in every branch (the code comment
      // above `getAccessPrivilegesForPlatformSupport` states the new role
      // must never hold the catch-all — flipping that back on would pass
      // silently without this assertion).
      it('should grant PLATFORM_SUPPORT no privileges on L0 without allowPlatformSupportAsAdmin', () => {
        const space = createSpace();
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings
        );

        const platformSupportRole = result.roles.find(
          r => r.roleName === RoleName.PLATFORM_SUPPORT
        );
        expect(platformSupportRole?.grantedPrivileges).toEqual([]);
        expect(platformSupportRole?.grantedPrivileges).not.toContain(
          AuthorizationPrivilege.READ_LICENSE
        );
      });

      it('should grant PLATFORM_SUPPORT CRUD when allowPlatformSupportAsAdmin is true', () => {
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

        const platformSupportRole = result.roles.find(
          r => r.roleName === RoleName.PLATFORM_SUPPORT
        );
        expect(platformSupportRole?.grantedPrivileges).toEqual(
          expect.arrayContaining([
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
            AuthorizationPrivilege.GRANT,
          ])
        );
        expect(platformSupportRole?.grantedPrivileges).not.toContain(
          AuthorizationPrivilege.READ_LICENSE
        );
      });

      it('should grant PLATFORM_SUPPORT PUBLIC_SHARE when both allowPlatformSupportAsAdmin and allowGuestContributions are true', () => {
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

        const platformSupportRole = result.roles.find(
          r => r.roleName === RoleName.PLATFORM_SUPPORT
        );
        expect(platformSupportRole?.grantedPrivileges).toContain(
          AuthorizationPrivilege.PUBLIC_SHARE
        );
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
              roleName: RoleName.PLATFORM_SUPPORT,
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
          r => r.roleName === RoleName.PLATFORM_SUPPORT
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
              roleName: RoleName.PLATFORM_SUPPORT,
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
          r => r.roleName === RoleName.PLATFORM_SUPPORT
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

      // 027-platform-role-redesign (qual-server-3 fix) — PLATFORM_SUPPORT's
      // L1/L2 parent-inheritance twin of the GLOBAL_SUPPORT cases above.
      // Critically, this asserts the branch keys on the parent's OWN
      // `RoleName.PLATFORM_SUPPORT` cell — the exact copy-paste slip
      // (keying on `RoleName.PLATFORM_SUPPORT` instead) the finding named as
      // the failure mode this test closes.
      it('should grant PLATFORM_SUPPORT CRUD when parent has UPDATE for platform-support', () => {
        const parentAccess: IPlatformRolesAccess = {
          roles: [
            {
              roleName: RoleName.PLATFORM_SUPPORT,
              grantedPrivileges: [AuthorizationPrivilege.UPDATE],
            },
          ],
        };
        (platformAccessService.hasRolePrivilege as any).mockImplementation(
          (roles: any, roleName: RoleName, privilege: AuthorizationPrivilege) =>
            roleName === RoleName.PLATFORM_SUPPORT &&
            privilege === AuthorizationPrivilege.UPDATE
        );
        const space = createSpace({ level: SpaceLevel.L1 });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings,
          parentAccess
        );

        const platformSupportRole = result.roles.find(
          r => r.roleName === RoleName.PLATFORM_SUPPORT
        );
        expect(platformSupportRole?.grantedPrivileges).toEqual(
          expect.arrayContaining([
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
            AuthorizationPrivilege.GRANT,
          ])
        );
        expect(platformSupportRole?.grantedPrivileges).not.toContain(
          AuthorizationPrivilege.READ_LICENSE
        );
        expect(platformAccessService.hasRolePrivilege).toHaveBeenCalledWith(
          parentAccess.roles,
          RoleName.PLATFORM_SUPPORT,
          AuthorizationPrivilege.UPDATE
        );
      });

      // 027-platform-role-redesign (T077, Slice B): the ROLE-CONFLATION hazard
      // this test guards is unchanged, but its fixture had to change: it used a
      // legacy `global-support` cell carrying UPDATE next to a
      // `platform-support` cell that did not, and `global-support` is gone. The
      // hazard is now expressed with a role that genuinely still exists —
      // `platform-license-manager` holds UPDATE on the parent, Support does not,
      // and Support must NOT inherit CRUD from another role's cell.
      it('should NOT grant PLATFORM_SUPPORT CRUD when only ANOTHER platform role has UPDATE on the parent', () => {
        const parentAccess: IPlatformRolesAccess = {
          roles: [
            {
              roleName: RoleName.PLATFORM_LICENSE_MANAGER,
              grantedPrivileges: [AuthorizationPrivilege.UPDATE],
            },
            {
              roleName: RoleName.PLATFORM_SUPPORT,
              grantedPrivileges: [AuthorizationPrivilege.READ],
            },
          ],
        };
        (platformAccessService.hasRolePrivilege as any).mockImplementation(
          (roles: any, roleName: RoleName, privilege: AuthorizationPrivilege) =>
            roleName === RoleName.PLATFORM_LICENSE_MANAGER &&
            privilege === AuthorizationPrivilege.UPDATE
        );
        const space = createSpace({ level: SpaceLevel.L1 });
        const result = service.createPlatformRolesAccess(
          space,
          defaultSettings,
          parentAccess
        );

        const platformSupportRole = result.roles.find(
          r => r.roleName === RoleName.PLATFORM_SUPPORT
        );
        expect(platformSupportRole?.grantedPrivileges).toEqual([]);
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
