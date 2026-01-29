import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UpdateVirtualContributorSettingsPrivacyInput } from './virtual.contributor.settings.privacy.dto.update';

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
