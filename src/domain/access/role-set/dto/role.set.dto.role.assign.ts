import { RoleName } from '@common/enums/role.name';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignRoleOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  roleSetID!: string;

  @Field(() => UUID, { nullable: false })
  actorId!: string;

  @Field(() => RoleName, { nullable: false })
  role!: RoleName;
}

/** @deprecated Use AssignRoleOnRoleSetInput */
export { AssignRoleOnRoleSetInput as AssignRoleOnRoleSetToUserInput };
/** @deprecated Use AssignRoleOnRoleSetInput */
export { AssignRoleOnRoleSetInput as AssignRoleOnRoleSetToOrganizationInput };
/** @deprecated Use AssignRoleOnRoleSetInput */
export {
  AssignRoleOnRoleSetInput as AssignRoleOnRoleSetToVirtualContributorInput,
};
