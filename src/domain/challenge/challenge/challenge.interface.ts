import { IOrganisation, Organisation } from '@domain/community';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IChallengeBase } from '../challenge-base';

@ObjectType('Challenge')
export abstract class IChallenge extends IChallengeBase {
  childChallenges?: IChallenge[];
  opportunities?: IOpportunity[];

  @Field(() => [Organisation], {
    description: 'The Organisations that are leading this Challenge.',
  })
  leadOrganisations?: IOrganisation[];
}
