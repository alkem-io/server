import { describe, expect, it } from 'vitest';
import { Organization } from './organization.entity';

// The `@AfterLoad` defaulting hook must heal a `settings.membership` object
// whose row predates the "allow Spaces to invite this organization" key,
// without ever throwing and without touching a row that already carries an
// explicit value (including an explicit `false`).
describe('Organization entity — applyMembershipSettingsDefaults (@AfterLoad)', () => {
  it('fills in the missing key with the mandated default (true)', () => {
    const organization = new Organization();
    organization.settings = {
      membership: { allowUsersMatchingDomainToJoin: false },
      privacy: { contributionRolesPubliclyVisible: true },
    } as any;

    organization.applyMembershipSettingsDefaults();

    expect(organization.settings.membership.allowSpaceInvitations).toBe(true);
  });

  it('never overwrites an existing explicit false', () => {
    const organization = new Organization();
    organization.settings = {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: false,
      },
      privacy: { contributionRolesPubliclyVisible: true },
    } as any;

    organization.applyMembershipSettingsDefaults();

    expect(organization.settings.membership.allowSpaceInvitations).toBe(false);
  });

  it('never overwrites an existing explicit true', () => {
    const organization = new Organization();
    organization.settings = {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: true,
      },
      privacy: { contributionRolesPubliclyVisible: true },
    } as any;

    organization.applyMembershipSettingsDefaults();

    expect(organization.settings.membership.allowSpaceInvitations).toBe(true);
  });

  it('is a no-op (never throws) when settings.membership is entirely absent', () => {
    const organization = new Organization();
    organization.settings = {} as any;

    expect(() => organization.applyMembershipSettingsDefaults()).not.toThrow();
    expect(organization.settings.membership).toBeUndefined();
  });

  it('is a no-op (never throws) when settings itself is absent', () => {
    const organization = new Organization();

    expect(() => organization.applyMembershipSettingsDefaults()).not.toThrow();
  });

  it('fills in allowApplications with the mandated default (true) when absent', () => {
    const organization = new Organization();
    organization.settings = {
      membership: { allowUsersMatchingDomainToJoin: false },
      privacy: { contributionRolesPubliclyVisible: true },
    } as any;

    organization.applyMembershipSettingsDefaults();

    expect(organization.settings.membership.allowApplications).toBe(true);
  });

  it('never overwrites an existing explicit allowApplications: false', () => {
    const organization = new Organization();
    organization.settings = {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowApplications: false,
      },
      privacy: { contributionRolesPubliclyVisible: true },
    } as any;

    organization.applyMembershipSettingsDefaults();

    expect(organization.settings.membership.allowApplications).toBe(false);
  });
});

describe('Organization entity — applySecuritySettingsDefaults (@AfterLoad)', () => {
  it('creates the default block on a row written before the rule existed', () => {
    const organization = new Organization();
    organization.settings = {
      membership: { allowUsersMatchingDomainToJoin: false },
      privacy: { contributionRolesPubliclyVisible: true },
    } as any;

    organization.applySecuritySettingsDefaults();

    expect(organization.settings.security).toEqual({
      secondFactorRequired: false,
      secondFactorRequiredSince: null,
    });
  });

  it('defaults a key missing inside an existing block', () => {
    const organization = new Organization();
    organization.settings = {
      membership: { allowUsersMatchingDomainToJoin: false },
      privacy: { contributionRolesPubliclyVisible: true },
      security: { secondFactorRequired: true },
    } as any;

    organization.applySecuritySettingsDefaults();

    expect(organization.settings.security).toEqual({
      secondFactorRequired: true,
      secondFactorRequiredSince: null,
    });
  });

  it('leaves a stored block as it is', () => {
    const security = {
      secondFactorRequired: true,
      secondFactorRequiredSince: '2026-11-01T10:00:00.000Z',
    };
    const organization = new Organization();
    organization.settings = {
      membership: { allowUsersMatchingDomainToJoin: false },
      privacy: { contributionRolesPubliclyVisible: true },
      security: { ...security },
    } as any;

    organization.applySecuritySettingsDefaults();

    expect(organization.settings.security).toEqual(security);
  });

  it('leaves an entity loaded without settings alone', () => {
    const organization = new Organization();

    expect(() => organization.applySecuritySettingsDefaults()).not.toThrow();
    expect(organization.settings).toBeUndefined();
  });
});
