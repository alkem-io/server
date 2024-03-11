import { Field, InterfaceType } from '@nestjs/graphql';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IOpportunity, Opportunity } from '@domain/challenge/opportunity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { UUID, NameID } from '@domain/common/scalars';
import { IChallenge } from '../challenge/challenge.interface';
import { Space } from '../space/space.entity';
import { ISpace } from '../space/space.interface';

@InterfaceType('Journey', {
  resolveType(journey) {
    if (journey instanceof Space) return ISpace;
    if (journey instanceof Challenge) return IChallenge;
    if (journey instanceof Opportunity) return IOpportunity;

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
