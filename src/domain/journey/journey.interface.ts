import { InterfaceType } from '@nestjs/graphql';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';

@InterfaceType('Journey', {
  description: 'Journey',
  resolveType(journey) {
    if ('challenge' in journey) {
      // space
    } else if ('spaceID' in journey) {
      // challenge
    } else if ('projects' in journey) {
      // opportunity
    }

    throw new RelationshipNotFoundException(
      `Unable to determine journey type for '${journey.id}'`,
      LogContext.CHALLENGES
    );
  },
})
export class IJourney1 extends IBaseChallenge {}
