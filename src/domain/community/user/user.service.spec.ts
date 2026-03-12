import { EntityNotFoundException } from '@common/exceptions';
import { User } from '@domain/community/user/user.entity';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let userRepo: {
    findOne: ReturnType<typeof vi.fn>;
    findBy: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
    manager: { transaction: ReturnType<typeof vi.fn> };
  };
  let mockGetUserById: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockGetUserById = vi.fn();

    userRepo = {
      findOne: vi.fn(),
      findBy: vi.fn(),
      save: vi.fn(),
      createQueryBuilder: vi.fn(),
      manager: { transaction: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: UserLookupService,
          useValue: {
            getUserById: mockGetUserById,
            getUserByIdOrFail: mockGetUserById,
            getUserByAuthenticationID: vi.fn(),
            getUserByEmail: vi.fn(),
            usersWithCredential: vi.fn(),
          },
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return ConfigServiceMock;
        }

        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserByIdOrFail', () => {
    it('should throw when empty userID provided', async () => {
      await expect(service.getUserByIdOrFail('')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should return user when found', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com' };
      mockGetUserById.mockResolvedValue(mockUser);

      const result = await service.getUserByIdOrFail('user-1');

      expect(result).toBe(mockUser);
    });

    it('should throw EntityNotFoundException when user not found', async () => {
      mockGetUserById.mockResolvedValue(null);

      await expect(service.getUserByIdOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should throw on invalid email format', async () => {
      await expect(service.getUserByEmail('not-an-email')).rejects.toThrow();
    });

    it('should query repository with lowercase email', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail('Test@Example.com');

      expect(result).toBe(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });

    it('should return null when no user found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.getUserByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should save and return user', async () => {
      const user = { id: 'user-1' } as any;
      userRepo.save.mockResolvedValue(user);

      const result = await service.save(user);

      expect(result).toBe(user);
    });
  });
});

const ConfigServiceMock = {
  get: vi.fn().mockReturnValue({
    kratos_admin_base_url_server: 'mockUrl',
  }),
};
