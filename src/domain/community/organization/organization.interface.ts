import { IProfile } from '@domain/community/profile/profile.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchable } from '@domain/common/interfaces/searchable.interface';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { INameable } from '@domain/common/entity/nameable-entity';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { IPreferenceSet } from '@domain/common/preference-set';

@ObjectType('Organization', {
  implements: () => [IGroupable, ISearchable],
})
export abstract class IOrganization extends INameable {
  profile?: IProfile;
  groups?: IUserGroup[];
  agent?: IAgent;

  @Field(() => String, {
    nullable: true,
    description: 'Legal name - required if hosting an Hub',
  })
  legalEntityName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Organization website',
  })
  website?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Organization contact email',
  })
  contactEmail?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Domain name; what is verified, eg. alkem.io',
  })
  domain?: string;

  @Field(() => IOrganizationVerification, { nullable: false })
  verification?: IOrganizationVerification;

  preferenceSet?: IPreferenceSet;
}
