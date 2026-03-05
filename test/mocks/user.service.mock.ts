import { UserService } from '@domain/community/user/user.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockUserService: ValueProvider<PublicPart<UserService>> = {
  provide: UserService,
  useValue: {
    createUser: vi.fn(),
    deleteUser: vi.fn(),
    save: vi.fn(),
    getUserByIdOrFail: vi.fn(),
    getUserByEmail: vi.fn(),
    getUsersForQuery: vi.fn(),
    getPaginatedUsers: vi.fn(),
    updateUser: vi.fn(),
    getProfile: vi.fn(),
  },
};
