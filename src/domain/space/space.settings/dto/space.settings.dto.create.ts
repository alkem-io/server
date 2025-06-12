import { Field, InputType } from '@nestjs/graphql';
import { CreateSpaceSettingsPrivacyInput } from './space.settings.privacy.dto.create';
import { CreateSpaceSettingsMembershipInput } from './space.settings.membership.dto.create';
import { CreateSpaceSettingsCollaborationInput } from './space.settings.collaboration.dto.create';

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
