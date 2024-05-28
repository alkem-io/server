import { Field, InterfaceType } from '@nestjs/graphql';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { UUID, NameID } from '@domain/common/scalars';
import { IUser, User } from '../user';
import { IOrganization, Organization } from '../organization';
import {
  IVirtualContributor,
  VirtualContributor,
} from '../virtual-contributor';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IAgent } from '@domain/agent';

@InterfaceType('Contributor', {
  resolveType(journey) {
    if (journey instanceof User) return IUser;
    if (journey instanceof Organization) return IOrganization;
    if (journey instanceof VirtualContributor) return IVirtualContributor;

    throw new RelationshipNotFoundException(
      `Unable to determine contributor type for ${journey.id}`,
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
}
