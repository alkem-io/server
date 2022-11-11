import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ILocation } from '@domain/common/location';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('Profile')
export abstract class IProfile extends IAuthorizable {
  references?: IReference[];

  tagsets?: ITagset[];

  avatar?: IVisual;

  location?: ILocation;

  @Field(() => String, {
    nullable: true,
    description:
      'A short description of the entity associated with this profile.',
  })
  description!: string;

  restrictedTagsetNames?: string[];
}
