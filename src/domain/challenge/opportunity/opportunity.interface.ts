import { Field, ObjectType } from '@nestjs/graphql';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IJourney } from '@domain/challenge/base-challenge/journey.interface';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { IAccount } from '../account/account.interface';
@ObjectType('Opportunity', {
  implements: () => [IJourney],
})
export abstract class IOpportunity extends IBaseChallenge implements IJourney {
  rowId!: number;

  challenge?: IChallenge;

  @Field(() => IAccount, {
    nullable: false,
    description: 'The Account for this Opportunity',
  })
  account!: IAccount;
}
