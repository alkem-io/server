import { RoleName } from '@common/enums/role.name';
import { IRoleSet } from '@domain/access/role-set';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Invitation')
export class IInvitation extends IAuthorizable {
  invitedActorID!: string;
  createdBy?: string;

  roleSet?: IRoleSet;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle!: ILifecycle;

  @Field(() => String, { nullable: true })
  welcomeMessage?: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether to also add the invited actor to the parent community.',
  })
  invitedToParent!: boolean;

  @Field(() => [RoleName], {
    nullable: false,
    description:
      'Additional roles to assign to the Actor, in addition to the entry Role.',
  })
  extraRoles!: RoleName[];

  @Field(() => String, {
    nullable: true,
    description:
      'Optional language the inviter expects the invitee to prefer; recorded per invitation.',
  })
  suggestedLanguage?: string;

  @Field(() => [RoleName], {
    nullable: true,
    description:
      'Offered extra roles that could not be granted when this invitation was accepted (organizations only, cap consumed in the meantime). Transient: set only on the object returned by the accept mutation, never persisted, and null everywhere else.',
  })
  extraRolesWithheld?: RoleName[];
}
