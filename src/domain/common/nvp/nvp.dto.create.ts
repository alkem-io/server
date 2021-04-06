import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateNVPInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  value!: string;
}
