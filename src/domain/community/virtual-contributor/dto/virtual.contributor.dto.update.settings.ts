import { UUID } from '@domain/common/scalars';
import { UpdateVirtualContributorSettingsEntityInput } from '@domain/community/virtual-contributor-settings/dto/virtual.contributor.settings.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateVirtualContributorSettingsInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the VirtualCOntributor whose settings are to be updated.',
  })
  virtualContributorID!: string;

  @Field(() => UpdateVirtualContributorSettingsEntityInput, {
    nullable: false,
    description: 'Update the settings for the VirtualContributor.',
  })
  @ValidateNested()
  @Type(() => UpdateVirtualContributorSettingsEntityInput)
  settings!: UpdateVirtualContributorSettingsEntityInput;
}
