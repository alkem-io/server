import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockUserGroupService: ValueProvider<PublicPart<UserGroupService>> =
  {
    provide: UserGroupService,
    useValue: {
      getUserGroupOrFail: vi.fn(),
      assignUser: vi.fn(),
      removeUser: vi.fn(),
      addGroupWithName: vi.fn(),
      getMembers: vi.fn(),
      getGroups: vi.fn(),
      getProfile: vi.fn(),
    },
  };
