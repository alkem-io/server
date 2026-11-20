import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IPlatformSettings } from './platform.settings.interface';
import { platformSecuritySettings } from './platform.settings.security.defaults';
import { IPlatformSettingsSecurity } from './platform.settings.security.interface';

@Resolver(() => IPlatformSettings)
export class PlatformSettingsResolverFields {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @ResolveField('security', () => IPlatformSettingsSecurity, {
    nullable: true,
    description:
      'The second-factor rule for platform roles. Null unless the reader holds the platform-settings privilege.',
  })
  async security(
    @CurrentActor() actorContext: ActorContext,
    @Parent() settings: IPlatformSettings
  ): Promise<IPlatformSettingsSecurity | null> {
    // `platform`-rooted documents are public, so a plain field would publish
    // the platform's posture and deadline to every reader.
    const granted = this.authorizationService.isAccessGranted(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN
    );
    return granted ? platformSecuritySettings(settings) : null;
  }
}
