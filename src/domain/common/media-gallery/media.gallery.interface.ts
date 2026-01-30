import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '../entity/authorizable-entity';
import { INameable } from '../entity/nameable-entity';
import { IVisual } from '../visual';

@ObjectType('MediaGallery')
export class IMediaGallery extends IAuthorizable {
  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => [IVisual], {
    nullable: false,
    description: 'The visuals contained in this media gallery.',
  })
  visuals?: IVisual[];

  @Field(() => IStorageBucket, {
    nullable: true,
    description: 'The storage bucket associated with this media gallery.',
  })
  storageBucket?: IStorageBucket;
}
