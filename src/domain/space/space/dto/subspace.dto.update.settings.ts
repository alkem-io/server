import { UpdateSpaceSettingsInput } from '@domain/space/space.settings/dto/space.settings.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateSubspaceSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Subspace whose settings are to be updated.',
  })
  subspaceID!: string;

  @Field(() => UpdateSpaceSettingsInput, {
    nullable: false,
    description: 'Update the settings for the Subspace.',
  })
  @ValidateNested()
  @Type(() => UpdateSpaceSettingsInput)
  settings!: UpdateSpaceSettingsInput;
}
