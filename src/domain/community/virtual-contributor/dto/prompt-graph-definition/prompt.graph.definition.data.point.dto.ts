import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PromptGraphDefinitionDataPoint {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  optional?: boolean;
}
