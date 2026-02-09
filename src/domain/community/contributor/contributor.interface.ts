import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IProfile } from '@domain/common/profile/profile.interface';
import { NameID, UUID } from '@domain/common/scalars';
import { Field, InterfaceType } from '@nestjs/graphql';
import { Organization } from '../organization/organization.entity';
import { IOrganization } from '../organization/organization.interface';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';
import { VirtualContributor } from '../virtual-contributor/virtual.contributor.entity';
import { IVirtualContributor } from '../virtual-contributor/virtual.contributor.interface';

@InterfaceType('Contributor', {
  resolveType(contributor) {
    if (contributor instanceof User) return IUser;
    if (contributor instanceof Organization) return IOrganization;
    if (contributor instanceof VirtualContributor) return IVirtualContributor;

    throw new RelationshipNotFoundException(
      `Unable to determine contributor type for ${contributor.id}`,
      LogContext.COMMUNITY
    );
  },
})
export abstract class IContributor {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Contributor',
  })
  id!: string;

  @Field(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'The authorization rules for the Contributor',
  })
  authorization?: IAuthorizationPolicy;

  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the Contributor, unique within a given scope.',
  })
  nameID!: string;

  @Field(() => IAgent, {
    nullable: false,
    description: 'The Agent for the Contributor.',
  })
  agent!: IAgent;

  @Field(() => IProfile, {
    nullable: false,
    description: 'The profile for the Contributor.',
  })
  profile!: IProfile;

  @Field(() => Date, {
    description: 'The date at which the entity was created.',
    nullable: false,
  })
  createdDate!: Date;

  @Field(() => Date, {
    description: 'The date at which the entity was last updated.',
    nullable: false,
  })
  updatedDate!: Date;
}
