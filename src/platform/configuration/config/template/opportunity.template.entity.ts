import { Field, ObjectType } from '@nestjs/graphql';
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

  constructor(name: string) {
    this.name = name;
  }
}
