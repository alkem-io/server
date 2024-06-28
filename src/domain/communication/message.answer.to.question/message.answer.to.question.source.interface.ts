import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('MessageAnswerToQuestionSource', {
  description: 'A source used in a detailed answer to a question.',
})
export class IAnswerToQuestionSource {
  @Field(() => String, {
    nullable: true,
    description: 'The URI of the source',
  })
  uri!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The title of the source',
  })
  title!: string;
}
