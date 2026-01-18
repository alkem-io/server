import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateSpaceSettingsPrivacyInput {
  @Field(() => SpacePrivacyMode, {
    nullable: true,
    description: '',
  })
  mode?: SpacePrivacyMode;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Flag to control if Platform Support has admin rights.',
  })
  allowPlatformSupportAsAdmin?: boolean;
}
