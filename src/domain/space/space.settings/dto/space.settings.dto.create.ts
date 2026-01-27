import { Field, InputType } from '@nestjs/graphql';
import { CreateSpaceSettingsCollaborationInput } from './space.settings.collaboration.dto.create';
import { CreateSpaceSettingsMembershipInput } from './space.settings.membership.dto.create';
import { CreateSpaceSettingsPrivacyInput } from './space.settings.privacy.dto.create';

@InputType()
export class CreateSpaceSettingsInput {
  @Field(() => CreateSpaceSettingsPrivacyInput, {
    nullable: true,
    description: '',
  })
  privacy?: CreateSpaceSettingsPrivacyInput;

  @Field(() => CreateSpaceSettingsMembershipInput, {
    nullable: true,
    description: '',
  })
  membership?: CreateSpaceSettingsMembershipInput;

  @Field(() => CreateSpaceSettingsCollaborationInput, {
    nullable: true,
    description: '',
  })
  collaboration?: CreateSpaceSettingsCollaborationInput;
}
