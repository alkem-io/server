import { CreateRoleSetInput } from '@domain/access/role-set/dto/role.set.dto.create';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';

export class CreateCommunityInput {
  guidelines!: CreateCommunityGuidelinesInput;

  name!: string;

  roleSetData!: CreateRoleSetInput;
}
