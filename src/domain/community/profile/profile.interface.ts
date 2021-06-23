import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('Profile')
export abstract class IProfile extends IAuthorizable {
  @Field(() => [IReference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  references?: IReference[];

  @Field(() => [ITagset], {
    nullable: true,
    description: 'A list of named tagsets, each of which has a list of tags.',
  })
  tagsets?: ITagset[];

  @Field(() => String, {
    nullable: true,
    description:
      'A URI that points to the location of an avatar, either on a shared location or a gravatar',
  })
  avatar!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'A short description of the entity associated with this profile.',
  })
  description!: string;

  restrictedTagsetNames?: string[];
}
