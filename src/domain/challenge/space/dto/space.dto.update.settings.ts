import { UpdateSpaceSettingsInput } from '@domain/challenge/space.settings/dto/space.settings.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateSpaceSettingsOnSpaceInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Space whose settings are to be updated.',
  })
  spaceID!: string;

  @Field(() => UpdateSpaceSettingsInput, {
    nullable: false,
    description: 'Update the settings for the Space.',
  })
  @ValidateNested()
  @Type(() => UpdateSpaceSettingsInput)
  settings!: UpdateSpaceSettingsInput;
}