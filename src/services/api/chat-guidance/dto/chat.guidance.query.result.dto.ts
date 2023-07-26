import { Field, ObjectType } from '@nestjs/graphql';
import { IChatGuidanceResult } from './chat.guidance.result.dto';

@ObjectType('ChatGuidanceQueryResult')
export abstract class IChatGuidanceQueryResult extends IChatGuidanceResult {
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
}
