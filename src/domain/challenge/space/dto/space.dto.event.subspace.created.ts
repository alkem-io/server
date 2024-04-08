import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { ISpace } from '../space.interface';

@ObjectType('SubspaceCreated')
export class SubspaceCreated {
  eventID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the Space on which the subspace was created.',
  })
  journeyID!: string;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The subspace that has been created.',
  })
  childJourney!: ISpace;
}
