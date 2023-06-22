import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
@ObjectType('Challenge')
export abstract class IChallenge extends IBaseChallenge {
  childChallenges?: IChallenge[];
  opportunities?: IOpportunity[];

  storageBucket?: IStorageBucket;

  @Field(() => String, {
    description: 'The ID of the containing Space.',
    nullable: false,
  })
  spaceID?: string; //toDo make mandatory https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2196
}
