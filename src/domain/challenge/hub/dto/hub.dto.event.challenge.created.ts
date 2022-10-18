import { Field, ObjectType } from '@nestjs/graphql';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';

@ObjectType('ChallengeCreated')
export class ChallengeCreated {
  eventID!: string;

  @Field(() => String, {
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
