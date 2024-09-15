import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICommunication } from '@domain/communication/communication';
import { ICommunityGuidelines } from '../community-guidelines/community.guidelines.interface';
import { IRoleManager } from '@domain/access/role-manager';

@ObjectType('Community', {
  implements: () => [IGroupable],
})
export abstract class ICommunity extends IAuthorizable {
  groups?: IUserGroup[];

  parentCommunity?: ICommunity;

  roleManager!: IRoleManager;

  guidelines?: ICommunityGuidelines;

  communication?: ICommunication;

  parentID!: string;
}
