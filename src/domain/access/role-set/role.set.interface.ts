import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IForm } from '@domain/common/form/form.interface';
import { IPlatformInvitation } from '@platform/invitation/platform.invitation.interface';
import { IApplication } from '@domain/access/application/application.interface';
import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { IRole } from '../role/role.interface';
import { CommunityRoleType } from '@common/enums/community.role';

@ObjectType('RoleSet')
export abstract class IRoleSet extends IAuthorizable {
  roles?: IRole[];

  @Field(() => CommunityRoleType, {
    nullable: false,
    description:
      'The CommunityRole that acts as the entry Role for the RoleSet, so other roles potentially require it.',
  })
  entryRoleType!: CommunityRoleType;

  applications?: IApplication[];
  invitations?: IInvitation[];
  platformInvitations?: IPlatformInvitation[];

  applicationForm?: IForm;

  parentRoleSet?: IRoleSet;
}
