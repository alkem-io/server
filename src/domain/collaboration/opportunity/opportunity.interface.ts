import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { IProject } from '@domain/collaboration/project/project.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { ISearchable } from '@domain/common/interfaces/searchable.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
@ObjectType('Opportunity', {
  implements: () => [ISearchable],
})
export abstract class IOpportunity
  extends IBaseChallenge
  implements ISearchable
{
  @Field(() => [IProject], {
    nullable: true,
    description: 'The set of projects within the context of this Opportunity',
  })
  projects?: IProject[];

  relations?: IRelation[];

  hubID!: string;

  @Field(() => IChallenge, {
    nullable: true,
    description: 'The parent Challenge of the Opportunity',
  })
  challenge?: IChallenge;
}
