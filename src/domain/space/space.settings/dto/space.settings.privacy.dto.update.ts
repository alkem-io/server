import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { UserInformationVisibility } from '@common/enums/user.information.visibility';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateSpaceSettingsPrivacyInput {
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

  @Field(() => UserInformationVisibility, {
    nullable: true,
    description:
      'Controls who may read member-user information. Follows space visibility by default, or restricts it to members only.',
  })
  userInformationVisibility?: UserInformationVisibility;
}
