import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { HubVisibility } from '@common/enums/hub.visibility';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@ObjectType('Hub')
export abstract class IHub extends IBaseChallenge {
  @Field(() => HubVisibility, {
    description: 'Visibility of the Hub.',
    nullable: false,
  })
  visibility?: HubVisibility;

  challenges?: IChallenge[];

  templatesSet?: ITemplatesSet;

  timeline?: ITimeline;

  storageBucket?: IStorageBucket;
}
