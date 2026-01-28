import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { NameID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('INameable')
export abstract class INameable extends IAuthorizable {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  nameID!: string;

  // exposed through a field resolver
  profile!: IProfile;
}
