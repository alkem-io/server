import { Field, ObjectType } from '@nestjs/graphql';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@ObjectType('ChallengeCreated')
export class ChallengeCreated {
  eventID!: string;

  @Field(() => UUID_NAMEID, {
    nullable: false,
    description:
      'The identifier for the Hub on which the Challenge was created.',
  })
  hubID!: string;

  @Field(() => IChallenge, {
    nullable: false,
    description: 'The Challenge that has been created.',
  })
  challenge!: IChallenge;
}
