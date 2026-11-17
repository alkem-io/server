import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UpdateOrganizationSettingsMembershipInput } from './organization.settings.membership.dto.update';
import { UpdateOrganizationSettingsPrivacyInput } from './organization.settings.privacy.dto.update';
import { UpdateOrganizationSettingsSecurityInput } from './organization.settings.security.dto.update';

@InputType()
export class UpdateOrganizationSettingsEntityInput {
  @Field(() => UpdateOrganizationSettingsPrivacyInput, {
    nullable: true,
    description: '',
  })
  @ValidateNested()
  @Type(() => UpdateOrganizationSettingsPrivacyInput)
  privacy?: UpdateOrganizationSettingsPrivacyInput;

  @Field(() => UpdateOrganizationSettingsMembershipInput, {
    nullable: true,
    description: '',
  })
  @ValidateNested()
  @Type(() => UpdateOrganizationSettingsMembershipInput)
  membership?: UpdateOrganizationSettingsMembershipInput;

  @Field(() => UpdateOrganizationSettingsSecurityInput, {
    nullable: true,
    description: 'The second-factor rule for the members of this Organization.',
  })
  @ValidateNested()
  @Type(() => UpdateOrganizationSettingsSecurityInput)
  security?: UpdateOrganizationSettingsSecurityInput;
}
