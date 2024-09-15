import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { PlatformRole } from '@common/enums/platform.role';
import { IPlatform } from '@platform/platfrom/platform.interface';
import { IRoleManager } from '@domain/access/role-manager';

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

  roleManager?: IRoleManager;

  platform?: IPlatform;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether to also add the invited user to the parent community.',
  })
  communityInvitedToParent!: boolean;

  @Field(() => PlatformRole, {
    nullable: true,
    description: 'The platform role the user will receive when they sign up',
  })
  platformRole?: PlatformRole;
}
