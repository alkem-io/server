import { Field, ObjectType } from '@nestjs/graphql';
import { FeedbackTemplate } from './feedback.template.entity';

@ObjectType()
export class ChallengeTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Challenge template name.',
  })
  name: string;

  @Field(() => [FeedbackTemplate], {
    nullable: true,
    description: 'Feedback templates.',
  })
  feedback?: FeedbackTemplate[];

  constructor();
  constructor(name: string);
  constructor(name?: string) {
    this.name = name || 'default';
  }
}
