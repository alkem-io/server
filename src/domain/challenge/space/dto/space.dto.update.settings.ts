import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateSpaceSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Space whose settings are to be updated.',
  })
  spaceID!: string;
}
