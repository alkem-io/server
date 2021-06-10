import { Field, ObjectType } from '@nestjs/graphql';
import { ChallengeTemplate } from '@src/services/platform/configuration/config/template/challenge.template.entity';
import { EcoverseTemplate } from '@src/services/platform/configuration/config/template/ecoverse.template.entity';
import { OpportunityTemplate } from './opportunity.template.entity';
import { IOpportunityTemplate } from './opportunity.template.interface';
import { ITemplate } from './template.interface';
import { UserTemplate } from './user.template.entity';
import { IUserTemplate } from './user.template.interface';

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
    description: 'User templates.',
  })
  users?: IUserTemplate[];

  @Field(() => [OpportunityTemplate], {
    nullable: false,
    description: 'Opportunity templates.',
  })
  opportunities?: IOpportunityTemplate[];

  @Field(() => [EcoverseTemplate], {
    nullable: false,
    description: 'Ecoverse templates.',
  })
  ecoverses?: EcoverseTemplate[];

  @Field(() => [ChallengeTemplate], {
    nullable: false,
    description: 'Challenge templates.',
  })
  challenges?: ChallengeTemplate[];

  constructor(name: string) {
    this.name = name;
  }
}
