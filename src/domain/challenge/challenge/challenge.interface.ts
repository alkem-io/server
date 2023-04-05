import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { IStorageSpace } from '@domain/storage/storage-space/storage.space.interface';
@ObjectType('Challenge')
export abstract class IChallenge extends IBaseChallenge {
  childChallenges?: IChallenge[];
  opportunities?: IOpportunity[];

  storageSpace?: IStorageSpace;

  @Field(() => String, {
    description: 'The ID of the containing Hub.',
    nullable: false,
  })
  hubID?: string; //toDo make mandatory https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2196
}
