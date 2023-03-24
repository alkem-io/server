import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { NameID } from '@domain/common/scalars';
import { IProfile } from '@domain/common/profile/profile.interface';

@ObjectType('INameable')
export abstract class INameable extends IAuthorizable {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  nameID!: string;

  profile!: IProfile;
}
