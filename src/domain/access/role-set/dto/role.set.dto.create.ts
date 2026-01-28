import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { IRoleSet } from '../role.set.interface';

export class CreateRoleSetInput {
  parentRoleSet?: IRoleSet;
  roles!: CreateRoleInput[];
  applicationForm!: CreateFormInput;
  entryRoleName!: RoleName;
  type!: RoleSetType;
}
