import { ObjectType, Field, InputType } from '@nestjs/graphql';

@InputType('PromptGraphDataPointInput')
@ObjectType()
export class PromptGraphDataPoint {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  optional?: boolean;
}
