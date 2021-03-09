import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class NVPInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  value!: string;
}
