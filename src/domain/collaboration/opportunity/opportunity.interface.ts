import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '../../challenge/base-challenge/base.challenge.interface';
import { IProject } from '@domain/collaboration/project/project.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
@ObjectType('Opportunity')
export abstract class IOpportunity extends IBaseChallenge {
  @Field(() => [IProject], {
    nullable: true,
    description: 'The set of projects within the context of this Opportunity',
  })
  projects?: IProject[];

  spaceID?: string; //toDo make mandatory https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2196

  challenge?: IChallenge;
}
