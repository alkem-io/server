import { Field, ObjectType } from '@nestjs/graphql';
import { ISpaceSettingsCollaboration } from './space.settings.collaboration.interface';
import { ISpaceSettingsMembership } from './space.settings.membership.interface';
import { ISpaceSettingsPrivacy } from './space.settings.privacy.interface';

@ObjectType('SpaceSettings')
export abstract class ISpaceSettings {
  @Field(() => ISpaceSettingsPrivacy, {
    nullable: false,
    description: 'The privacy settings for this Space',
  })
  privacy!: ISpaceSettingsPrivacy;

  @Field(() => ISpaceSettingsMembership, {
    nullable: false,
    description: 'The membership settings for this Space.',
  })
  membership!: ISpaceSettingsMembership;

  @Field(() => ISpaceSettingsCollaboration, {
    nullable: false,
    description: 'The collaboration settings for this Space.',
  })
  collaboration!: ISpaceSettingsCollaboration;
}
