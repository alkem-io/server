import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICommunication } from '@domain/communication/communication';
import { IRoleSet } from '@domain/access/role-set';
import { IPlatformAccess } from '@domain/access/platform-access/platform.access.interface';

@ObjectType('Community', {
  implements: () => [IGroupable],
})
export abstract class ICommunity extends IAuthorizable {
  groups?: IUserGroup[];

  roleSet!: IRoleSet;

  platformAccess!: IPlatformAccess;

  communication?: ICommunication;

  parentID!: string;
}
