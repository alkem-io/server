import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { UserPreferenceType } from '@common/enums/user.preference.type';

@InputType()
export class UpdateUserPreferenceInput {
  @Field(() => UUID_NAMEID_EMAIL, {
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
