import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { IRoleManager } from '../role.manager.interface';

export class CreateRoleManagerInput {
  parentRoleManager?: IRoleManager;
  roles!: CreateRoleInput[];
  applicationForm!: CreateFormInput;
}
