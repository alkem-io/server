import { IPlatformSettings } from './platform.settings.interface';
import { IPlatformSettingsSecurity } from './platform.settings.security.interface';

/**
 * The platform's second-factor rule for any stored settings value. The one
 * owner of its default: an absent block, or a key absent inside it, reads as
 * off / never switched on.
 */
export function platformSecuritySettings(
  settings: Pick<IPlatformSettings, 'security'> | null | undefined
): IPlatformSettingsSecurity {
  const stored = settings?.security;
  const since = stored?.secondFactorRequiredForPlatformRolesSince;
  return {
    secondFactorRequiredForPlatformRoles:
      stored?.secondFactorRequiredForPlatformRoles === true,
    secondFactorRequiredForPlatformRolesSince: since ? new Date(since) : null,
  };
}
