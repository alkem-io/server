import { Field, ObjectType } from '@nestjs/graphql';
import { EcoverseTemplate } from '@utils/config/template/ecoverse.template.entity';
import { OpportunityTemplate } from './opportunity.template.entity';
import { IOpportunityTemplate } from './opportunity.template.interface';
import { ITemplate } from './template.interface';
import { UserTemplate } from './user.template.entity';
import { IUserTemplate } from './user.template.interface';
import { ChallengeTemplate } from '@utils/config/template/challenge.template.entity';

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

  @Field(() => [OpportunityTemplate], {
    nullable: false,
    description: 'Ecoverses template.',
  })
  ecoverses?: EcoverseTemplate[];

  @Field(() => [OpportunityTemplate], {
    nullable: false,
    description: 'Challenges template.',
  })
  challenges?: ChallengeTemplate[];

  constructor(name: string) {
    this.name = name;
  }
}
