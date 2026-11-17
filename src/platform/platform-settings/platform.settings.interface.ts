import { Field, ObjectType } from '@nestjs/graphql';
import { IPlatformSettingsIntegration } from './platform.settings.integrations.interface';
import { PlatformSettingsSecurityStored } from './platform.settings.security.interface';

@ObjectType('PlatformSettings')
export abstract class IPlatformSettings {
  @Field(() => IPlatformSettingsIntegration, {
    nullable: false,
    description: 'The integration settings for this Platform',
  })
  integration!: IPlatformSettingsIntegration;

  /**
   * The second-factor rule as stored. Exposed in GraphQL only through the
   * gated `security` field resolver, as `PlatformSettingsSecurity`.
   */
  security?: PlatformSettingsSecurityStored;
}
