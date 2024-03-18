import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IJourney } from '../base-challenge/journey.interface';
import { IBaseChallenge } from '../base-challenge/base.challenge.interface';
import { IAccount } from '../account/account.interface';
@ObjectType('Challenge', {
  implements: () => [IJourney],
})
export abstract class IChallenge extends IBaseChallenge implements IJourney {
  rowId!: number;
  opportunities?: IOpportunity[];

  @Field(() => IAccount, {
    nullable: false,
    description: 'The Account for this Challenge',
  })
  account!: IAccount;
}
