import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@ObjectType('Space')
export abstract class ISpace extends IBaseChallenge {
  @Field(() => SpaceVisibility, {
    description: 'Visibility of the Space.',
    nullable: false,
  })
  visibility?: SpaceVisibility;

  challenges?: IChallenge[];

  templatesSet?: ITemplatesSet;

  timeline?: ITimeline;

  storageBucket?: IStorageBucket;
}
