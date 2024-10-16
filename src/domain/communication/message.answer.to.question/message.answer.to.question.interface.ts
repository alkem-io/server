import { Field, ObjectType } from '@nestjs/graphql';
import { IAnswerToQuestionSource } from './message.answer.to.question.source.interface';

@ObjectType('MessageAnswerQuestion', {
  description: 'A detailed answer to a question, typically from an AI service.',
})
export class IMessageAnswerToQuestion {
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

  @Field(() => [IAnswerToQuestionSource], {
    nullable: true,
    description: 'The sources used to answer the question',
  })
  sources?: IAnswerToQuestionSource[];

  @Field(() => String, {
    nullable: false,
    description: 'The answer to the question',
  })
  answer!: string;

  threadId?: string;
}
