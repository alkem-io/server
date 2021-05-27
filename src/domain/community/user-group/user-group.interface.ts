import { IAuthorizable } from '@domain/common/authorizable-entity';
import { ISearchable } from '@domain/common/interfaces';
import { IProfile } from '@domain/community/profile/profile.interface';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('UserGroup', {
  implements: () => [ISearchable],
})
export abstract class IUserGroup extends IAuthorizable {
  @Field(() => String)
  name!: string;

  @Field(() => IProfile, {
    nullable: true,
    description: 'The profile for the user group',
  })
  profile?: IProfile;
}
