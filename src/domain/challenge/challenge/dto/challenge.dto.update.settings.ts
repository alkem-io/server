import { UpdateSpaceSettingsInput } from '@domain/challenge/space.settings/dto/space.settings.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateChallengeSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Challenge whose settings are to be updated.',
  })
  challengeID!: string;

  @Field(() => UpdateSpaceSettingsInput, {
    nullable: false,
    description: 'Update the settings for the Challene.',
  })
  @ValidateNested()
  @Type(() => UpdateSpaceSettingsInput)
  settings!: UpdateSpaceSettingsInput;
}
