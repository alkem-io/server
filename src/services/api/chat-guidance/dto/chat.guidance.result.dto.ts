import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ChatGuidanceResult')
export abstract class IChatGuidanceResult {
  @Field(() => String, {
    nullable: false,
    description: 'The answer to the question',
  })
  answer!: string;
}
