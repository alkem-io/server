import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { ISearchable } from '@domain/common/interfaces/searchable.interface';

@ObjectType('Challenge', {
  implements: () => [ISearchable],
})
export abstract class IChallenge extends IBaseChallenge implements ISearchable {
  childChallenges?: IChallenge[];
  opportunities?: IOpportunity[];

  ecoverseID!: string;
}
