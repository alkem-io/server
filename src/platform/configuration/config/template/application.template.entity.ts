import { Field, ObjectType } from '@nestjs/graphql';
import { QuestionTemplate } from '@src/platform/configuration/config/template/question.template.entity';

@ObjectType()
export class ApplicationTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Application template name.',
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
