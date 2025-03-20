import { CreateRoleSetInput } from '@domain/access/role-set/dto/role.set.dto.create';

export class CreateCommunityInput {
  name!: string;

  roleSetData!: CreateRoleSetInput;
}
