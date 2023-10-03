import { ProfileType } from '@common/enums/profile.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ILocation } from '@domain/common/location';
import { IReference } from '@domain/common/reference/reference.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('Profile')
export abstract class IProfile extends IAuthorizable {
  @Field(() => String, {
    nullable: false,
    description: 'The display name.',
  })
  displayName!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The taglie for this entity.',
  })
  tagline!: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'A description of the entity associated with this profile.',
  })
  description!: string;

  storageBucket?: IStorageBucket;

  references?: IReference[];

  tagsets?: ITagset[];

  visuals?: IVisual[];

  location?: ILocation;

  type!: ProfileType;
}
