import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ChatGuidanceResult')
export abstract class IChatGuidanceQueryResult {
  @Field(() => String, {
    nullable: true,
    description: 'The id of the answer; null if an error was returned',
  })
  id?: string;

  @Field(() => String, {
    nullable: false,
    description: 'The original question',
  })
  question!: string;

  @Field(() => [ISource], {
    nullable: true,
    description: 'The sources used to answer the question',
  })
  sources?: ISource[];

  @Field(() => String, {
    nullable: false,
    description: 'The answer to the question',
  })
  answer!: string;
}

@ObjectType('Source')
export abstract class ISource {
  @Field(() => String, {
    nullable: true,
    description: 'The URI of the source',
  })
  uri?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The title of the source',
  })
  title?: string;
}
