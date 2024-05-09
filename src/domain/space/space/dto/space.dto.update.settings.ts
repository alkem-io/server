import { UpdateSpaceSettingsEntityInput } from '@domain/space/space.settings/dto/space.settings.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateSpaceSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Space whose settings are to be updated.',
  })
  spaceID!: string;

  @Field(() => UpdateSpaceSettingsEntityInput, {
    nullable: false,
    description: 'Update the settings for the Space.',
  })
  @ValidateNested()
  @Type(() => UpdateSpaceSettingsEntityInput)
  settings!: UpdateSpaceSettingsEntityInput;
}
