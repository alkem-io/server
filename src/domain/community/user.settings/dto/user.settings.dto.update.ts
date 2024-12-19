import { Field, InputType } from '@nestjs/graphql';
import { UpdateUserSettingsPrivacyInput } from './user.settings.privacy.dto.update';
import { UpdateUserSettingsCommunicationInput } from './user.settings.communications.dto.update';

@InputType()
export class UpdateUserSettingsEntityInput {
  @Field(() => UpdateUserSettingsPrivacyInput, {
    nullable: true,
    description: '',
  })
  privacy?: UpdateUserSettingsPrivacyInput;

  @Field(() => UpdateUserSettingsCommunicationInput, {
    nullable: true,
    description: '',
  })
  communication?: UpdateUserSettingsCommunicationInput;
}
