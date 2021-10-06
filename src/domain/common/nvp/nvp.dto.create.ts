import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateNVPInput {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => String, { nullable: false })
  value!: string;

  @Field(() => Number, { nullable: false })
  sortOrder!: number;
}
