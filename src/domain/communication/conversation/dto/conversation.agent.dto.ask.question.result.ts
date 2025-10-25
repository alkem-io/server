import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('MessageAnswerQuestion', {
  description: 'A detailed answer to a question, typically from an AI service.',
})
export class ConversationAgentAskQuestionResult {
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

  @Field(() => String, {
    nullable: true,
    description: 'Error message if an error occurred',
  })
  error?: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Message successfully sent. If false, error will have the reason.',
  })
  success!: boolean;
}
