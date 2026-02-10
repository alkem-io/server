import { IRoleSet } from '@domain/access/role-set';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { ICommunication } from '@domain/communication/communication';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('Community', {
  implements: () => [IGroupable],
})
export abstract class ICommunity extends IAuthorizable {
  groups?: IUserGroup[];

  roleSet!: IRoleSet;

  communication?: ICommunication;

  parentID!: string;
}
