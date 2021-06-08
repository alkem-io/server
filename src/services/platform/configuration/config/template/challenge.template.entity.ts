import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationTemplate } from '@src/services/platform/configuration/config/template/application.template.entity';

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

  constructor();
  constructor(name: string);
  constructor(name?: string) {
    this.name = name || 'default';
  }
}
