import { Field, ObjectType } from '@nestjs/graphql';
import { IProject } from '@domain/collaboration/project/project.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IJourney } from '@domain/challenge/base-challenge/journey.interface';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
@ObjectType('Opportunity', {
  implements: () => [IJourney],
})
export abstract class IOpportunity extends IBaseChallenge implements IJourney {
  rowId!: number;
  @Field(() => [IProject], {
    nullable: true,
    description: 'The set of projects within the context of this Opportunity',
  })
  projects?: IProject[];

  challenge?: IChallenge;
}
