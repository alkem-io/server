import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockUserGroupService: ValueProvider<PublicPart<UserGroupService>> =
  {
    provide: UserGroupService,
    useValue: {
      getUserGroupOrFail: jest.fn(),
      assignUser: jest.fn(),
      removeUser: jest.fn(),
      addGroupWithName: jest.fn(),
      getMembers: jest.fn(),
      getGroups: jest.fn(),
      getProfile: jest.fn(),
    },
  };
