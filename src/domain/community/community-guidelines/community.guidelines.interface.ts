import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';

@ObjectType('CommunityGuidelines')
export abstract class ICommunityGuidelines extends IAuthorizable {
  @Field(() => IProfile, {
    nullable: false,
    description: 'The details of the guidelilnes',
  })
  profile!: IProfile;
}
