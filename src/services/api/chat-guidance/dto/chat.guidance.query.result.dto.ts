import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ChatGuidanceResult')
export abstract class IChatGuidanceQueryResult {
  @Field(() => String, {
    nullable: false,
    description: 'The original question',
  })
  question!: string;

  @Field(() => [ISource], {
    nullable: false,
    description: 'The sources used to answer the question',
  })
  sources!: ISource[];

  @Field(() => String, {
    nullable: false,
    description: 'The answer to the question',
  })
  answer!: string;
}

@ObjectType('Source')
export abstract class ISource {
  @Field(() => String, {
    nullable: false,
    description: 'The URI of the source',
  })
  uri!: string;
}
