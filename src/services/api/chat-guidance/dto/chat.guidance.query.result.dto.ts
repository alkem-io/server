import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ChatGuidanceResult')
export abstract class IChatGuidanceQueryResult {
  @Field(() => String, {
    nullable: false,
    description: 'The original question',
  })
  question!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The sources used to answer the question',
  })
  sources!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The answer to the question',
  })
  answer!: string;

  @Field(() => Number, {
    nullable: true,
    description: 'Cost of the query, in USD',
  })
  cost?: number;
}
