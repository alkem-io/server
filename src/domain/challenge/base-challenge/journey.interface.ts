import { Field, InterfaceType } from '@nestjs/graphql';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IChallenge } from '../challenge/challenge.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { ISpace } from '../space/space.interface';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { UUID, NameID } from '@domain/common/scalars';

@InterfaceType('Journey', {
  resolveType(journey) {
    if (!journey.innovationFlow) return ISpace;
    if (journey.parentSpace) return IChallenge;
    if (journey.challenge) return IOpportunity;

    throw new RelationshipNotFoundException(
      `Unable to determine Journey type for ${journey.id}`,
      LogContext.CHALLENGES
    );
  },
})
export abstract class IJourney {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Journey',
  })
  id!: string;

  @Field(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'The authorization rules for the Journey',
  })
  authorization?: IAuthorizationPolicy;

  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the Journey, unique within a given scope.',
  })
  nameID!: string;

  @Field(() => ICollaboration, {
    nullable: true,
    description: 'Collaboration object for the Journey',
  })
  collaboration?: ICollaboration;
}
