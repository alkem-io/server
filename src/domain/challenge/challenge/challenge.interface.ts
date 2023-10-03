import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
@ObjectType('Challenge')
export abstract class IChallenge extends IBaseChallenge {
  rowId!: number;
  childChallenges?: IChallenge[];
  opportunities?: IOpportunity[];

  storageBucket?: IStorageBucket;
  innovationFlow?: IInnovationFlow;

  @Field(() => String, {
    description: 'The ID of the containing Space.',
    nullable: false,
  })
  spaceID!: string;
}
