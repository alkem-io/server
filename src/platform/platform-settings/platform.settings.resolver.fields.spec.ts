import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { IPlatformSettings } from './platform.settings.interface';
import { PlatformSettingsResolverFields } from './platform.settings.resolver.fields';

describe('PlatformSettingsResolverFields.security', () => {
  let resolver: PlatformSettingsResolverFields;
  let authorizationService: Mocked<AuthorizationService>;
  const platformPolicy = { id: 'platform-policy' } as any;

  const stored = {
    integration: { iframeAllowedUrls: [], notificationEmailBlacklist: [] },
    security: {
      secondFactorRequiredForPlatformRoles: true,
      secondFactorRequiredForPlatformRolesSince: '2026-11-01T10:00:00.000Z',
    },
  } as IPlatformSettings;
  const withoutBlock = {
    integration: { iframeAllowedUrls: [], notificationEmailBlacklist: [] },
  } as IPlatformSettings;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformSettingsResolverFields],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PlatformSettingsResolverFields);
    authorizationService = module.get(AuthorizationService);
    const platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as Mocked<PlatformAuthorizationPolicyService>;
    platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
      platformPolicy
    );
  });

  const actor = (anonymous = false) =>
    Object.assign(new ActorContext(), {
      actorID: anonymous ? '' : 'actor-1',
      isAnonymous: anonymous,
    });

  it('returns the stored block to a Platform Settings Admin', async () => {
    authorizationService.isAccessGranted.mockReturnValue(true);
    const reader = actor();

    const result = await resolver.security(reader, stored);

    expect(result).toEqual({
      secondFactorRequiredForPlatformRoles: true,
      secondFactorRequiredForPlatformRolesSince: new Date(
        '2026-11-01T10:00:00.000Z'
      ),
    });
    expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
      reader,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN
    );
  });

  it('returns the defaults to a Platform Settings Admin for a row without the block', async () => {
    authorizationService.isAccessGranted.mockReturnValue(true);

    const result = await resolver.security(actor(), withoutBlock);

    expect(result).toEqual({
      secondFactorRequiredForPlatformRoles: false,
      secondFactorRequiredForPlatformRolesSince: null,
    });
  });

  it.each([
    ['an anonymous reader', true],
    ['a signed-in reader without the privilege', false],
  ])('returns null to %s', async (_label, anonymous) => {
    authorizationService.isAccessGranted.mockReturnValue(false);

    const result = await resolver.security(actor(anonymous), stored);

    expect(result).toBeNull();
  });
});
