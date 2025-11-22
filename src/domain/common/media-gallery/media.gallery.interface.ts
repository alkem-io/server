import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '../entity/nameable-entity';
import { IVisual } from '../visual';

@ObjectType('MediaGallery')
export class IMediaGallery extends INameable {
  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => [IVisual], {
    nullable: true,
    description: 'The visuals contained in this media gallery.',
  })
  visuals?: IVisual[];
}
