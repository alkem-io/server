import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class UpdateUserPreferenceInput {
  @Field(() => UUID, {
    description: 'ID of the user preference',
  })
  id!: string;

  @Field(() => String)
  value!: string;
}
