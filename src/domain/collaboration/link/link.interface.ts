import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Link')
export abstract class ILink extends IAuthorizable {
  profile!: IProfile;

  @Field(() => String, {
    nullable: false,
    description: 'URI of the Link',
  })
  uri!: string;
}
