import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { UserInformationVisibility } from '@common/enums/user.information.visibility';
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

  // Additive, backward compatible: absent on existing rows is treated as
  // FOLLOW_SPACE_VISIBILITY. Nullable in GraphQL so pre-existing spaces that
  // never persisted this key still resolve.
  @Field(() => UserInformationVisibility, {
    nullable: true,
    description:
      'Controls who may read member-user information. Follows space visibility by default, or restricts it to members only. Absent is treated as follow-space-visibility.',
  })
  userInformationVisibility?: UserInformationVisibility;
}
