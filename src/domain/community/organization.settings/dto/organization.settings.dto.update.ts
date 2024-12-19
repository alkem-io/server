import { Field, InputType } from '@nestjs/graphql';
import { UpdateOrganizationSettingsPrivacyInput } from './organization.settings.privacy.dto.update';
import { UpdateOrganizationSettingsMembershipInput } from './organization.settings.membership.dto.update';

@InputType()
export class UpdateOrganizationSettingsEntityInput {
  @Field(() => UpdateOrganizationSettingsPrivacyInput, {
    nullable: true,
    description: '',
  })
  privacy?: UpdateOrganizationSettingsPrivacyInput;

  @Field(() => UpdateOrganizationSettingsMembershipInput, {
    nullable: true,
    description: '',
  })
  membership?: UpdateOrganizationSettingsMembershipInput;
}
