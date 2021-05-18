import { IRelation } from '@domain/collaboration/relation';
import { IProject, Project } from '@domain/collaboration/project';
import { IChallengeBase } from '@domain/challenge';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Opportunity')
export abstract class IOpportunity extends IChallengeBase {
  @Field(() => [Project], {
    nullable: true,
    description: 'The set of projects within the context of this Opportunity',
  })
  projects?: IProject[];

  relations?: IRelation[];
}
