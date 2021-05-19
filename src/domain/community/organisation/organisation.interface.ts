import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IBaseCherrytwist } from '@domain/common/base-entity';
import { IProfile } from '@domain/community/profile/profile.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IGroupable, ISearchable } from '@domain/common/interfaces';
@ObjectType('Organisation', {
  implements: () => [IGroupable, ISearchable],
})
export abstract class IOrganisation extends IBaseCherrytwist {
  @Field(() => String, { nullable: false, description: '' })
  name!: string;

  @Field(() => String, {
    nullable: false,
    description: 'A short text identifier for this Organisation',
  })
  textID!: string;

  profile?: IProfile;
  challenges?: IChallenge[];
  groups?: IUserGroup[];
}
