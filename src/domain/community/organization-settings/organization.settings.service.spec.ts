import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { UpdateOrganizationSettingsEntityInput } from './dto/organization.settings.dto.update';
import { IOrganizationSettings } from './organization.settings.interface';
import { OrganizationSettingsService } from './organization.settings.service';

describe('OrganizationSettingsService', () => {
  let service: OrganizationSettingsService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationSettingsService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(OrganizationSettingsService);
  });

  const buildSettings = (
    overrides: Partial<IOrganizationSettings> = {}
  ): IOrganizationSettings => {
    return {
      privacy: { contributionRolesPubliclyVisible: false },
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: true,
        allowApplications: true,
      },
      ...overrides,
    } as IOrganizationSettings;
  };

  describe('updateSettings', () => {
    it('should update privacy.contributionRolesPubliclyVisible when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        privacy: { contributionRolesPubliclyVisible: true },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(true);
    });

    it('should update membership.allowUsersMatchingDomainToJoin when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        membership: { allowUsersMatchingDomainToJoin: true },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(true);
    });

    it('should update membership.allowSpaceInvitations when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowSpaceInvitations: false,
        },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.membership.allowSpaceInvitations).toBe(false);
    });

    it('should leave membership.allowSpaceInvitations unchanged when undefined', () => {
      const settings = buildSettings({
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowSpaceInvitations: false,
        },
      } as any);
      const updateData: UpdateOrganizationSettingsEntityInput = {
        membership: { allowUsersMatchingDomainToJoin: true },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.membership.allowSpaceInvitations).toBe(false);
      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(true);
    });

    it('should update membership.allowApplications when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowApplications: false,
        },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.membership.allowApplications).toBe(false);
    });

    it('should leave membership.allowApplications unchanged when undefined', () => {
      const settings = buildSettings({
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowSpaceInvitations: true,
          allowApplications: false,
        },
      } as any);
      const updateData: UpdateOrganizationSettingsEntityInput = {
        membership: { allowUsersMatchingDomainToJoin: true },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.membership.allowApplications).toBe(false);
      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(true);
    });

    it('leaves membership.allowApplications unchanged when explicitly null', () => {
      // `@IsOptional()` skips validation for null, so an explicit null reaches
      // the service; writing it would persist null into the jsonb column and
      // the @AfterLoad `??= true` would then silently re-open applications an
      // organization had deliberately closed.
      const settings = buildSettings({
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowSpaceInvitations: true,
          allowApplications: false,
        },
      } as any);
      const updateData = {
        membership: { allowApplications: null },
      } as unknown as UpdateOrganizationSettingsEntityInput;

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.membership.allowApplications).toBe(false);
    });

    it('leaves membership.allowUsersMatchingDomainToJoin unchanged when omitted', () => {
      // The field is nullable in the GraphQL input precisely so a client
      // editing only the OTHER switch does not have to echo this one back and
      // clobber a concurrent change to it.
      const settings = buildSettings({
        membership: {
          allowUsersMatchingDomainToJoin: true,
          allowSpaceInvitations: true,
        },
      } as any);
      const updateData: UpdateOrganizationSettingsEntityInput = {
        membership: { allowSpaceInvitations: false },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(true);
      expect(result.membership.allowSpaceInvitations).toBe(false);
    });

    it('should not change privacy when privacy update data is not provided', () => {
      const settings = buildSettings({
        privacy: { contributionRolesPubliclyVisible: true },
      } as any);
      const updateData: UpdateOrganizationSettingsEntityInput = {
        membership: { allowUsersMatchingDomainToJoin: true },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(true);
    });

    it('should not change membership when membership update data is not provided', () => {
      const settings = buildSettings({
        membership: { allowUsersMatchingDomainToJoin: true },
      } as any);
      const updateData: UpdateOrganizationSettingsEntityInput = {
        privacy: { contributionRolesPubliclyVisible: false },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(true);
    });

    it('should update both privacy and membership when both are provided', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        privacy: { contributionRolesPubliclyVisible: true },
        membership: { allowUsersMatchingDomainToJoin: true },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(true);
      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(true);
    });

    it('should leave settings unchanged when update data is empty', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {};

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(false);
      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(false);
    });

    it('should return the same settings object (mutates in place)', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        privacy: { contributionRolesPubliclyVisible: true },
      };

      const { settings: result } = service.updateSettings(settings, updateData);

      expect(result).toBe(settings);
    });
  });
});

describe('OrganizationSettingsService — the second-factor rule switch', () => {
  const service = new OrganizationSettingsService({} as never);
  const STORED_SINCE = '2026-10-01T08:00:00Z';
  const withRule = (on: boolean, since: string | null): IOrganizationSettings =>
    ({
      privacy: { contributionRolesPubliclyVisible: false },
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: true,
        allowApplications: true,
      },
      security: { secondFactorRequired: on, secondFactorRequiredSince: since },
    }) as IOrganizationSettings;
  const turn = (on: boolean) => ({ security: { secondFactorRequired: on } });

  it('records now as the switch-on time on off→on, with the transition', () => {
    const before = Date.now();

    const { settings, transition } = service.updateSettings(
      withRule(false, null),
      turn(true)
    );

    const since = settings.security.secondFactorRequiredSince;
    expect(settings.security.secondFactorRequired).toBe(true);
    expect(new Date(since as string).getTime()).toBeGreaterThanOrEqual(before);
    expect(transition).toEqual({ from: false, to: true, since });
  });

  it('keeps the stored switch-on time exactly on on→on, with no transition', () => {
    const { settings, transition } = service.updateSettings(
      withRule(true, STORED_SINCE),
      turn(true)
    );

    expect(settings.security).toEqual({
      secondFactorRequired: true,
      secondFactorRequiredSince: STORED_SINCE,
    });
    expect(transition).toBeUndefined();
  });

  it('keeps the stored switch-on time on on→off, with the transition', () => {
    const { settings, transition } = service.updateSettings(
      withRule(true, STORED_SINCE),
      turn(false)
    );

    expect(settings.security).toEqual({
      secondFactorRequired: false,
      secondFactorRequiredSince: STORED_SINCE,
    });
    expect(transition).toEqual({ from: true, to: false, since: STORED_SINCE });
  });

  it('leaves the rule intact on a privacy-only update', () => {
    const { settings, transition } = service.updateSettings(
      withRule(true, STORED_SINCE),
      { privacy: { contributionRolesPubliclyVisible: true } }
    );

    expect(settings.privacy.contributionRolesPubliclyVisible).toBe(true);
    expect(settings.security).toEqual({
      secondFactorRequired: true,
      secondFactorRequiredSince: STORED_SINCE,
    });
    expect(transition).toBeUndefined();
  });

  it('ignores an explicit null for the switch', () => {
    const { settings, transition } = service.updateSettings(
      withRule(true, STORED_SINCE),
      { security: { secondFactorRequired: null as unknown as boolean } }
    );

    expect(settings.security.secondFactorRequired).toBe(true);
    expect(transition).toBeUndefined();
  });
});
