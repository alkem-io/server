import { RoleName } from '@common/enums/role.name';
import { IRoleSet } from '@domain/access/role-set';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IPlatform } from '@platform/platform/platform.interface';

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

  @Field(() => [RoleName], {
    nullable: false,
    description:
      'Additional roles to assign to the Contributor, in addition to the entry Role.',
  })
  roleSetExtraRoles!: RoleName[];

  @Field(() => RoleName, {
    nullable: true,
    description: 'The platform role the user will receive when they sign up',
  })
  platformRole?: RoleName;
}
