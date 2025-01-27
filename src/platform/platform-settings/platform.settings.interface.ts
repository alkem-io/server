import { Field, ObjectType } from '@nestjs/graphql';
import { IPlatformSettingsPrivacy } from './platform.settings.privacy.interface';

@ObjectType('PlatformSettings')
export abstract class IPlatformSettings {
  @Field(() => IPlatformSettingsPrivacy, {
    nullable: false,
    description: 'The privacy settings for this Platform',
  })
  privacy!: IPlatformSettingsPrivacy;
}
