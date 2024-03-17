import { Field, InputType } from '@nestjs/graphql';
import { UpdateSpaceSettingsPrivacyInput } from './space.settings.privacy.dto.update';
import { UpdateSpaceSettingsMembershipInput } from './space.settings.membership.dto.update';
import { UpdateSpaceSettingsCollaborationInput } from './space.settings.collaboration.dto.update';

@InputType()
export class UpdateSpaceSettingsInput {
  @Field(() => UpdateSpaceSettingsPrivacyInput, {
    nullable: true,
    description: '',
  })
  privacy?: UpdateSpaceSettingsPrivacyInput;

  @Field(() => UpdateSpaceSettingsMembershipInput, {
    nullable: true,
    description: '',
  })
  membership?: UpdateSpaceSettingsMembershipInput;

  @Field(() => UpdateSpaceSettingsCollaborationInput, {
    nullable: true,
    description: '',
  })
  collaboration?: UpdateSpaceSettingsCollaborationInput;
}
