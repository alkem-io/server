import { UUID } from '@domain/common/scalars';
import { UpdateOrganizationSettingsEntityInput } from '@domain/community/organization.settings/dto/organization.settings.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateOrganizationSettingsInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the Organization whose settings are to be updated.',
  })
  organizationID!: string;

  @Field(() => UpdateOrganizationSettingsEntityInput, {
    nullable: false,
    description: 'Update the settings for the Organization.',
  })
  @ValidateNested()
  @Type(() => UpdateOrganizationSettingsEntityInput)
  settings!: UpdateOrganizationSettingsEntityInput;
}
