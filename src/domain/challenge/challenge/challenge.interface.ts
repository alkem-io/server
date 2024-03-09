import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { ObjectType } from '@nestjs/graphql';
import { IJourney } from '../base-challenge/journey.interface';
import { IBaseChallenge } from '../base-challenge/base.challenge.interface';
@ObjectType('Challenge', {
  implements: () => [IJourney],
})
export abstract class IChallenge extends IBaseChallenge implements IJourney {
  rowId!: number;
  opportunities?: IOpportunity[];
}
