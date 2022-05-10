import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResult } from './membership.dto.result';

@ObjectType()
export class MembershipResultChallengeLeading extends MembershipResult {
  // Add in the identifier for the Hub where the Challenge is
  @Field(() => String, {
    description: 'The ID of the Hub hosting this Challenge.',
  })
  hubID = '';
}
