import { Field, ObjectType } from '@nestjs/graphql';
import { OpportunityTemplate } from './opportunity.template.entity';
import { IOpportunityTemplate } from './opportunity.template.interface';
import { IUxTemplate } from './template.interface';
import { UserTemplate } from './user.template.entity';
import { IUserTemplate } from './user.template.interface';

@ObjectType()
export class UxTemplate implements IUxTemplate {
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

  @Field(() => [UserTemplate], {
    nullable: false,
    description: 'Users template.',
  })
  users?: IUserTemplate[];

  @Field(() => [OpportunityTemplate], {
    nullable: false,
    description: 'Opportunities template.',
  })
  opportunities?: IOpportunityTemplate[];

  constructor(name: string) {
    this.name = name;
  }
}
