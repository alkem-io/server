import { Field, ObjectType } from '@nestjs/graphql';
import { ChallengeTemplate } from './challenge.template.entity';
import { PlatformHubTemplate } from './hub.template.entity';
import { OpportunityTemplate } from './opportunity.template.entity';
import { IOpportunityTemplate } from './opportunity.template.interface';
import { ITemplate } from './template.interface';
import { UserTemplate } from './user.template.entity';
import { IUserTemplate } from './user.template.interface';
import { OrganizationTemplate } from './organization.template.entity';

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

  @Field(() => [PlatformHubTemplate], {
    nullable: false,
    description: 'Hub templates.',
  })
  hubs?: PlatformHubTemplate[];

  @Field(() => [ChallengeTemplate], {
    nullable: false,
    description: 'Challenge templates.',
  })
  challenges?: ChallengeTemplate[];

  @Field(() => [OrganizationTemplate], {
    nullable: false,
    description: 'Challenge templates.',
  })
  organizations?: OrganizationTemplate[];

  constructor(name: string) {
    this.name = name;
  }
}
