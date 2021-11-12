import { Field, InputType } from '@nestjs/graphql';
import { UserPreferenceType } from '@src/common';

@InputType()
export class UpdateUserPreferenceInput {
  @Field(() => String)
  userId!: string;

  @Field(() => UserPreferenceType)
  userPreferenceType!: UserPreferenceType;

  @Field(() => String)
  value!: string;
}
