import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { IJourney } from '../base-challenge/journey.interface';

@ObjectType('Space', {
  implements: () => [IJourney],
})
export class ISpace extends IBaseChallenge implements IJourney {
  rowId!: number;

  challenges?: IChallenge[];
}
