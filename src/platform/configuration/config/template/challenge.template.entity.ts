import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationTemplate } from './application.template.entity';
import { FeedbackTemplate } from './feedback.template.entity';

@ObjectType()
export class ChallengeTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Challenge template name.',
  })
  name: string;

  @Field(() => [ApplicationTemplate], {
    nullable: true,
    description: 'Application templates.',
  })
  applications?: ApplicationTemplate[];

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
