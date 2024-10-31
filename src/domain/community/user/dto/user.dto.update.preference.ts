import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { UserPreferenceType } from '@common/enums/user.preference.type';

@InputType()
export class UpdateUserPreferenceInput {
  @Field(() => UUID, {
    description: 'ID of the User',
  })
  userID!: string;

  @Field(() => UserPreferenceType, {
    description: 'Type of the user preference',
  })
  type!: UserPreferenceType;

  @Field(() => String)
  value!: string;
}
