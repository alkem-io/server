import { Field, InputType } from '@nestjs/graphql';
import { ISpaceSettingsMembership } from '../space.settings.membership.interface';
import { ISpaceSettingsPrivacy } from '../space.settings.privacy.interface';
import { ISpaceSettingsCollaboration } from '../space.settings.collaboration.interface';

@InputType()
export class UpdateSpaceSettingsInput {
  @Field(() => ISpaceSettingsPrivacy, {
    nullable: false,
    description: '',
  })
  privacy!: ISpaceSettingsPrivacy;

  @Field(() => ISpaceSettingsMembership, {
    nullable: false,
    description: '',
  })
  membership!: ISpaceSettingsMembership;

  @Field(() => ISpaceSettingsCollaboration, {
    nullable: false,
    description: '',
  })
  collaboration!: ISpaceSettingsCollaboration;
}
