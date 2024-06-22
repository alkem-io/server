import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('UserGroup')
export abstract class IUserGroup extends IAuthorizable {
  @Field(() => IProfile, {
    nullable: true,
    description: 'The profile for the user group',
  })
  profile?: IProfile;
}
