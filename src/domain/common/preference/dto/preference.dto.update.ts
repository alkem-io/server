import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class UpdatePreferenceInput {
  @Field(() => UUID, {
    description: 'ID of the Preference',
  })
  preferenceID!: string;

  @Field(() => String)
  value!: string;
}
