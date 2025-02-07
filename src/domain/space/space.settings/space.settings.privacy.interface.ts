import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SpaceSettingsPrivacy')
export abstract class ISpaceSettingsPrivacy {
  @Field(() => SpacePrivacyMode, {
    nullable: false,
    description: 'The privacy mode for this Space',
  })
  mode!: SpacePrivacyMode;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag to control if Platform Support has admin rights.',
  })
  allowPlatformSupportAsAdmin!: boolean;
}
