import { IRelation } from '@domain/collaboration/relation';
import { IProject } from '@domain/collaboration/project';
import { IBaseChallenge } from '@domain/challenge/base-challenge';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Opportunity')
export abstract class IOpportunity extends IBaseChallenge {
  @Field(() => [IProject], {
    nullable: true,
    description: 'The set of projects within the context of this Opportunity',
  })
  projects?: IProject[];

  relations?: IRelation[];
}
