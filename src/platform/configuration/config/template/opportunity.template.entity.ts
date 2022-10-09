import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationTemplate } from '@src/platform/configuration/config/template/application.template.entity';
import { IOpportunityTemplate } from './opportunity.template.interface';

@ObjectType()
export class OpportunityTemplate implements IOpportunityTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Template opportunity name.',
  })
  name: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Template actor groups.',
  })
  actorGroups?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Template relations.',
  })
  relations?: string[];

  @Field(() => [ApplicationTemplate], {
    nullable: true,
    description: 'Application templates.',
  })
  applications?: ApplicationTemplate[];

  constructor(name: string) {
    this.name = name;
  }
}
