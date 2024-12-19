import { UpdateUserSettingsEntityInput } from '@domain/community/user.settings/dto/user.settings.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateUserSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the User whose settings are to be updated.',
  })
  userID!: string;

  @Field(() => UpdateUserSettingsEntityInput, {
    nullable: false,
    description: 'Update the settings for the User.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsEntityInput)
  settings!: UpdateUserSettingsEntityInput;
}
