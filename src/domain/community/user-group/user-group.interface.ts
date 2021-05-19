import { IBaseCherrytwist } from '@domain/common/base-entity';
import { IProfile } from '@domain/community/profile/profile.interface';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('UserGroup')
export abstract class IUserGroup extends IBaseCherrytwist {
  @Field(() => String)
  name!: string;

  @Field(() => IProfile, {
    nullable: true,
    description: 'The profile for the user group',
  })
  profile?: IProfile;
}
