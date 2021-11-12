import { Field, InputType } from '@nestjs/graphql';
import { UpdateBaseAlkemioInput } from '@src/domain';
import { UserPreferenceType } from '@src/common';

@InputType()
export class UpdateUserPreferenceInput extends UpdateBaseAlkemioInput {
  @Field(() => UserPreferenceType)
  userPreferenceType!: UserPreferenceType;

  @Field(() => String)
  value!: string;
}
