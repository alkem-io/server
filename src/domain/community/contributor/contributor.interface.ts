import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IProfile } from '@domain/common/profile/profile.interface';
import { NameID, UUID } from '@domain/common/scalars';
import { Field, InterfaceType } from '@nestjs/graphql';
import { IOrganization } from '../organization/organization.interface';
import { IUser } from '../user/user.interface';
import { IVirtualContributor } from '../virtual-contributor/virtual.contributor.interface';
import {
  isUser,
  isOrganization,
  isVirtualContributor,
} from './get.contributor.type';

@InterfaceType('Contributor', {
  resolveType(contributor) {
    if (isUser(contributor)) return IUser;
    if (isOrganization(contributor)) return IOrganization;
    if (isVirtualContributor(contributor)) return IVirtualContributor;

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
