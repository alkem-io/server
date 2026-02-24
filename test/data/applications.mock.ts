import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { IApplication } from '@domain/access/application/application.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { userData } from '@test/data/user.mock';

const now = new Date('2024-01-01T00:00:00.000Z');

const mockRoleSet: IRoleSet = {
  id: 'role-set-space-bde93e37-4581-4b27-a6d9-07f12b33847c',
  entryRoleName: RoleName.MEMBER,
  type: RoleSetType.SPACE,
  createdDate: now,
  updatedDate: now,
  roles: [],
} as IRoleSet;

const mockLifecycle: ILifecycle = {
  createdDate: now,
  updatedDate: now,
  machineState: 'active',
} as ILifecycle;

export const applicationsData: { applications: IApplication[] } = {
  applications: [
    {
      id: '18084faf-c950-4faf-baa8-15d74a5f715e',
      user: userData.user,
      roleSet: mockRoleSet,
      lifecycle: mockLifecycle,
      createdDate: now,
      updatedDate: now,
    } as IApplication,
  ],
};
