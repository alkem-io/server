import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { IApplication } from '@domain/access/application/application.interface';
import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IForm } from '@domain/common/form/form.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IRole } from '../role/role.interface';

@ObjectType('RoleSet')
export abstract class IRoleSet extends IAuthorizable {
  roles?: IRole[];

  @Field(() => RoleName, {
    nullable: false,
    description:
      'The Role that acts as the entry Role for the RoleSet, so other roles potentially require it.',
  })
  entryRoleName!: RoleName;

  applications?: IApplication[];
  invitations?: IInvitation[];
  platformInvitations?: IPlatformInvitation[];

  applicationForm?: IForm;

  parentRoleSet?: IRoleSet;

  license?: ILicense;

  @Field(() => RoleSetType, {
    nullable: true,
    description: 'A type of entity that this RoleSet is being used with.',
  })
  type!: RoleSetType;
}
