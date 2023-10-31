import { Field, InterfaceType } from '@nestjs/graphql';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IChallenge } from '../challenge/challenge.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { ISpace } from '../space/space.interface';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { INameable } from '@domain/common/entity/nameable-entity';

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
export abstract class IJourney extends INameable {
  @Field(() => ICollaboration, {
    nullable: true,
    description: 'Collaboration object for the base challenge',
  })
  collaboration?: ICollaboration;
}
