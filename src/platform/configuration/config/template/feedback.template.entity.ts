import { Field, ObjectType } from '@nestjs/graphql';
import { QuestionTemplate } from './question.template.entity';

@ObjectType()
export class FeedbackTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Feedback template name.',
  })
  name!: string;

  @Field(() => [QuestionTemplate], {
    nullable: false,
    description: 'Template questions.',
  })
  questions!: QuestionTemplate[];

  constructor();
  constructor(name: string);
  constructor(name?: string) {
    this.name = name || 'default';
    this.questions = [];
  }
}
