import { Field, InputType } from '@nestjs/graphql';
import { UpdateVirtualContributorSettingsPrivacyInput } from './virtual.contributor.settings.privacy.dto.update';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class UpdateVirtualContributorSettingsEntityInput {
  @Field(() => UpdateVirtualContributorSettingsPrivacyInput, {
    nullable: true,
    description: '',
  })
  @ValidateNested()
  @Type(() => UpdateVirtualContributorSettingsPrivacyInput)
  privacy?: UpdateVirtualContributorSettingsPrivacyInput;
}
