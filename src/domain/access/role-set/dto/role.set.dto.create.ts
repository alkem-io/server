import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { IRoleSet } from '../role.set.interface';
import { RoleType } from '@common/enums/role.type';

export class CreateRoleSetInput {
  parentRoleSet?: IRoleSet;
  roles!: CreateRoleInput[];
  applicationForm!: CreateFormInput;
  entryRoleType!: RoleType;
}
