import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IRoleSet } from '@domain/access/role-set';
import { RoleName } from '@common/enums/role.name';

@ObjectType('Invitation')
export class IInvitation extends IAuthorizable {
  invitedActorId!: string;
  createdBy!: string;

  roleSet?: IRoleSet;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle!: ILifecycle;

  @Field(() => String, { nullable: true })
  welcomeMessage?: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether to also add the invited contributor to the parent community.',
  })
  invitedToParent!: boolean;

  @Field(() => [RoleName], {
    nullable: false,
    description:
      'Additional roles to assign to the Contributor, in addition to the entry Role.',
  })
  extraRoles!: RoleName[];
}
