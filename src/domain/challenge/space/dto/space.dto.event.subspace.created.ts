import { Field, ObjectType } from '@nestjs/graphql';
import { IJourney } from '@domain/challenge/base-challenge/journey.interface';
import { UUID } from '@domain/common/scalars';

@ObjectType('SubspaceCreated')
export class SubspaceCreated {
  eventID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the Space on which the subspace was created.',
  })
  journeyID!: string;

  @Field(() => IJourney, {
    nullable: false,
    description: 'The subspace that has been created.',
  })
  childJourney!: IJourney;
}
