import { ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IForm } from '@domain/common/form/form.interface';
import { IPlatformInvitation } from '@platform/invitation';
import { IApplication } from '@domain/access/application/application.interface';
import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { IRole } from '../role/role.interface';

@ObjectType('RoleSet')
export abstract class IRoleSet extends IAuthorizable {
  roles?: IRole[];
  applications?: IApplication[];
  invitations?: IInvitation[];
  platformInvitations?: IPlatformInvitation[];

  applicationForm?: IForm;

  parentRoleSet?: IRoleSet;
}
