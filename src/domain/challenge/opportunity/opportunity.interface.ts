import { ObjectType } from '@nestjs/graphql';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { IJourney } from '../base-challenge/journey.interface';
@ObjectType('Opportunity', {
  implements: () => [IJourney],
})
export abstract class IOpportunity extends IBaseChallenge {
  rowId!: number;

  challenge?: IChallenge;
}
