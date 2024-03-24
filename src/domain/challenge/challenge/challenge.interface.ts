import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '../base-challenge/base.challenge.interface';
import { IJourney } from '../base-challenge/journey.interface';
@ObjectType('Challenge', {
  implements: () => [IJourney],
})
export abstract class IChallenge extends IBaseChallenge {
  rowId!: number;
  opportunities?: IOpportunity[];
}
