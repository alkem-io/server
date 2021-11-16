import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { UserPreferenceType } from '@src/common';

@InputType()
export class UpdateUserPreferenceInput {
  @Field(() => UUID, {
    description: 'ID of the user',
  })
  userID!: string;

  @Field(() => UserPreferenceType, {
    description: 'Type of the user preference',
  })
  type!: UserPreferenceType;

  @Field(() => String)
  value!: string;
}
