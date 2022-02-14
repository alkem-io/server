import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('Profile')
export abstract class IProfile extends IAuthorizable {
  references?: IReference[];

  tagsets?: ITagset[];

  avatar?: IVisual;

  @Field(() => String, {
    nullable: true,
    description:
      'A short description of the entity associated with this profile.',
  })
  description!: string;

  restrictedTagsetNames?: string[];
}
