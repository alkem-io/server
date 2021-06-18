import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { IProject } from '@domain/collaboration/project/project.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';

@ObjectType('Opportunity')
export abstract class IOpportunity extends IBaseChallenge {
  @Field(() => [IProject], {
    nullable: true,
    description: 'The set of projects within the context of this Opportunity',
  })
  projects?: IProject[];

  relations?: IRelation[];

  ecoverseID!: string;
}
