import { Field, InputType } from '@nestjs/graphql';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';

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
