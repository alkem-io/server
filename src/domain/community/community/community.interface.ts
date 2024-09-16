import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICommunication } from '@domain/communication/communication';
import { ICommunityGuidelines } from '../community-guidelines/community.guidelines.interface';
import { IRoleSet } from '@domain/access/role-set';

@ObjectType('Community', {
  implements: () => [IGroupable],
})
export abstract class ICommunity extends IAuthorizable {
  groups?: IUserGroup[];

  parentCommunity?: ICommunity;

  roleSet!: IRoleSet;

  guidelines?: ICommunityGuidelines;

  communication?: ICommunication;

  parentID!: string;
}
