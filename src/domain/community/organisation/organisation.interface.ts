import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IProfile } from '@domain/community/profile/profile.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { ObjectType } from '@nestjs/graphql';
import { IGroupable, ISearchable } from '@domain/common/interfaces';
import { IIdentifiable } from '@domain/common/identifiable-entity';
@ObjectType('Organisation', {
  implements: () => [IGroupable, ISearchable],
})
export abstract class IOrganisation extends IIdentifiable {
  profile?: IProfile;
  challenges?: IChallenge[];
  groups?: IUserGroup[];
}
