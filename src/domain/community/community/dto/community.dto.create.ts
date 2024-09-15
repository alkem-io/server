import { CreateRoleManagerInput } from '@domain/access/role-manager/dto/role.manager.dto.create';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';

export class CreateCommunityInput {
  guidelines!: CreateCommunityGuidelinesInput;

  name!: string;

  roleManagerData!: CreateRoleManagerInput;
}
