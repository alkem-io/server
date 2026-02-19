import { RoleName } from '@common/enums/role.name';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveRoleOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  roleSetID!: string;

  @Field(() => UUID, { nullable: false })
  actorID!: string;

  @Field(() => RoleName, { nullable: false })
  role!: RoleName;
}

/** @deprecated Use RemoveRoleOnRoleSetInput */
export { RemoveRoleOnRoleSetInput as RemoveRoleOnRoleSetFromUserInput };
/** @deprecated Use RemoveRoleOnRoleSetInput */
export { RemoveRoleOnRoleSetInput as RemoveRoleOnRoleSetFromOrganizationInput };
/** @deprecated Use RemoveRoleOnRoleSetInput */
export {
  RemoveRoleOnRoleSetInput as RemoveRoleOnRoleSetFromVirtualContributorInput,
};
