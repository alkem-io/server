import { IProfile } from '@domain/community/profile/profile.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchable } from '@domain/common/interfaces/searchable.interface';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { INameable } from '@domain/common/entity/nameable-entity';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';

@ObjectType('Organisation', {
  implements: () => [IGroupable, ISearchable],
})
export abstract class IOrganisation extends INameable {
  profile?: IProfile;
  groups?: IUserGroup[];
  agent?: IAgent;

  @Field(() => String, {
    nullable: true,
    description: '..required if hosting an ecoverse',
  })
  legalEntityName?: string;

  @Field(() => String, { nullable: true })
  domain?: string;

  @Field(() => String, { nullable: true })
  website?: string;

  @Field(() => String, { nullable: true })
  contactEmail?: string;

  @Field(() => OrganizationVerificationEnum)
  verified!: string;
}
