import { Field, InputType } from '@nestjs/graphql';
import { UpdateOrganizationSettingsPrivacyInput } from './organization.settings.privacy.dto.update';
import { UpdateOrganizationSettingsMembershipInput } from './organization.settings.membership.dto.update';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
}
