import { platformSecuritySettings } from './platform.settings.security.defaults';

describe('platformSecuritySettings', () => {
  const OFF = {
    secondFactorRequiredForPlatformRoles: false,
    secondFactorRequiredForPlatformRolesSince: null,
  };

  it.each([
    ['no settings', undefined],
    ['an empty settings value', {}],
    ['settings without a security block', { integration: {} }],
    ['an empty security block', { security: {} }],
  ])('reads %s as off and never switched on', (_label, settings) => {
    expect(platformSecuritySettings(settings as any)).toEqual(OFF);
  });

  it('returns a stored block, parsing the switch-on time to a Date', () => {
    const result = platformSecuritySettings({
      security: {
        secondFactorRequiredForPlatformRoles: true,
        secondFactorRequiredForPlatformRolesSince: '2026-11-01T10:00:00.000Z',
      },
    });

    expect(result.secondFactorRequiredForPlatformRoles).toBe(true);
    expect(result.secondFactorRequiredForPlatformRolesSince).toEqual(
      new Date('2026-11-01T10:00:00.000Z')
    );
  });
});
