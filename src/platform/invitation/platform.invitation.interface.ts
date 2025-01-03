import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { PlatformRole } from '@common/enums/platform.role';
import { IPlatform } from '@platform/platform/platform.interface';
import { IRoleSet } from '@domain/access/role-set';
import { RoleType } from '@common/enums/role.type';

@ObjectType('PlatformInvitation')
export class IPlatformInvitation extends IAuthorizable {
  @Field(() => String, {
    description: 'The email address of the external user being invited',
  })
  email!: string;

  @Field(() => String, {
    nullable: true,
  })
  firstName?: string;

  @Field(() => String, {
    nullable: true,
  })
  lastName?: string;

  @Field(() => Boolean, {
    description: 'Whether a new user profile has been created.',
  })
  profileCreated!: boolean;

  @Field(() => String, { nullable: true })
  welcomeMessage?: string;

  createdBy!: string;

  roleSet?: IRoleSet;

  platform?: IPlatform;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether to also add the invited user to the parent community.',
  })
  roleSetInvitedToParent!: boolean;

  @Field(() => RoleType, {
    nullable: true,
    description:
      'An additional role to assign to the Contributor, in addition to the entry Role.',
  })
  roleSetExtraRole?: RoleType;

  @Field(() => PlatformRole, {
    nullable: true,
    description: 'The platform role the user will receive when they sign up',
  })
  platformRole?: PlatformRole;
}
