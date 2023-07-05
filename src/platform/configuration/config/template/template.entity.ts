import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplate } from './template.interface';
import { ChallengeTemplate } from './challenge.template.entity';

@ObjectType()
export class Template implements ITemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Template name.',
  })
  name: string;

  @Field(() => String, {
    nullable: false,
    description: 'Template description.',
  })
  description?: string;

  @Field(() => [ChallengeTemplate], {
    nullable: false,
    description: 'Challenge templates.',
  })
  challenges?: ChallengeTemplate[];

  constructor(name: string) {
    this.name = name;
  }
}
