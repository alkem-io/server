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
    getPreferenceSetOrFail: jest.fn(),
    getUserOrFail: jest.fn(),
    getUserByEmail: jest.fn(),
    isRegisteredUser: jest.fn(),
    getUserAndCredentials: jest.fn(),
    getUserAndAgent: jest.fn(),
    getUserWithAgent: jest.fn(),
    getUsers: jest.fn(),
    getPaginatedUsers: jest.fn(),
    updateUser: jest.fn(),
    getAgent: jest.fn(),
    getProfile: jest.fn(),
    usersWithCredentials: jest.fn(),
    countUsersWithCredentials: jest.fn(),
    getCommunityRooms: jest.fn(),
    getDirectRooms: jest.fn(),
    createUserNameID: jest.fn(),
  },
};
