import { UserService } from '@domain/community/user/user.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockUserService: ValueProvider<PublicPart<UserService>> = {
  provide: UserService,
  useValue: {
    createUser: jest.fn(),
    createUserFromAgentInfo: jest.fn(),
    deleteUser: jest.fn(),
    save: jest.fn(),
    getUserOrFail: jest.fn(),
    getUserByEmail: jest.fn(),
    getUsersForQuery: jest.fn(),
    getPaginatedUsers: jest.fn(),
    updateUser: jest.fn(),
    getProfile: jest.fn(),
  },
};
