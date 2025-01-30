import { Field, ObjectType } from '@nestjs/graphql';
import { IPlatformSettingsIntegration } from './platform.settings.integrations.interface';

@ObjectType('PlatformSettings')
export abstract class IPlatformSettings {
  @Field(() => IPlatformSettingsIntegration, {
    nullable: false,
    description: 'The integration settings for this Platform',
  })
  integration!: IPlatformSettingsIntegration;
}
