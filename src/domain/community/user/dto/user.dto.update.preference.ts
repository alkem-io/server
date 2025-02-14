import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { PreferenceType } from '@common/enums/preference.type';
@InputType()
export class UpdateUserPreferenceInput {
  @Field(() => UUID, {
    description: 'ID of the User',
  })
  userID!: string;

  @Field(() => PreferenceType, {
    description: 'Type of the user preference',
  })
  type!: PreferenceType;

  @Field(() => String)
  value!: string;
}
