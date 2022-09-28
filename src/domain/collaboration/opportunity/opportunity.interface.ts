import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '../../challenge/base-challenge/base.challenge.interface';
import { IProject } from '@domain/collaboration/project/project.interface';
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

  hubID?: string; //toDo make mandatory https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2196

  @Field(() => IChallenge, {
    nullable: true,
    description: 'The parent Challenge of the Opportunity',
  })
  challenge?: IChallenge;
}
