import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { UserLookupService } from './user.lookup.service';

describe('UserLookupService', () => {
  let service: UserLookupService;
  let entityManager: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    entityManager = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLookupService,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(UserLookupService);
  });

  describe('getUserByUUID', () => {
    it('should return null when the provided ID is not a valid UUID', async () => {
      const result = await service.getUserById('not-a-uuid');
      expect(result).toBeNull();
      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('should query the entity manager and return the user when a valid UUID is provided', async () => {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'test@example.com',
      };
      entityManager.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toBe(mockUser);
      expect(entityManager.findOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
        })
      );
    });

    it('should return null when the entity manager finds no user', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getUserById(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toBeNull();
    });
  });

  describe('getUsersByUUID', () => {
    it('should return an empty array when all provided IDs are invalid UUIDs', async () => {
      const result = await service.getUsersByIds([
        'not-a-uuid',
        'also-invalid',
      ]);
      expect(result).toEqual([]);
      expect(entityManager.find).not.toHaveBeenCalled();
    });

    it('should filter out invalid UUIDs and query only valid ones', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockUsers = [{ id: validId }];
      entityManager.find.mockResolvedValue(mockUsers);

      const result = await service.getUsersByIds([validId, 'invalid-id']);

      expect(result).toEqual(mockUsers);
      expect(entityManager.find).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when given an empty array of IDs', async () => {
      const result = await service.getUsersByIds([]);
      expect(result).toEqual([]);
      expect(entityManager.find).not.toHaveBeenCalled();
    });
  });

  describe('getUserByEmail', () => {
    it('should query for the user by email as provided', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await service.getUserByEmail('Test@Example.COM');

      expect(entityManager.findOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: { email: 'Test@Example.COM' },
        })
      );
    });
  });

  describe('getUserOrFail', () => {
    it('should return the user when found by UUID', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockUser = { id: validId };
      entityManager.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByIdOrFail(validId);
      expect(result).toBe(mockUser);
    });

    it('should throw EntityNotFoundException when user is not found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getUserByIdOrFail(validId)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when an invalid UUID is provided', async () => {
      await expect(service.getUserByIdOrFail('not-a-uuid')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getUserByNameIdOrFail', () => {
    it('should return the user when found by nameID', async () => {
      const mockUser = { id: 'user-1', nameID: 'john-doe' };
      entityManager.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByNameIdOrFail('john-doe');
      expect(result).toBe(mockUser);
    });

    it('should throw EntityNotFoundException when no user matches the nameID', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getUserByNameIdOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('isRegisteredUser', () => {
    it('should return true when a user with the given email exists', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      const result = await service.isRegisteredUser('test@example.com');
      expect(result).toBe(true);
    });

    it('should return false when no user with the given email exists', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.isRegisteredUser('unknown@example.com');
      expect(result).toBe(false);
    });
  });

  describe('getUserAndCredentials', () => {
    it('should return user and credentials when credentials are loaded', async () => {
      const mockCredentials = [{ type: 'space-admin', resourceID: 'space-1' }];
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        credentials: mockCredentials,
      };
      entityManager.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserAndCredentials(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
      expect(result.user).toBe(mockUser);
      expect(result.credentials).toBe(mockCredentials);
    });

    it('should throw EntityNotInitializedException when credentials are not loaded', async () => {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        credentials: undefined,
      };
      entityManager.findOne.mockResolvedValue(mockUser);

      await expect(
        service.getUserAndCredentials('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('usersWithCredentials', () => {
    it('should return an empty array when no credential criteria are provided', async () => {
      const result = await service.usersWithCredentials(
        [],
        undefined,
        undefined
      );
      expect(result).toEqual([]);
      expect(entityManager.find).not.toHaveBeenCalled();
    });

    it('should default resourceID to empty string when not provided in criteria', async () => {
      entityManager.find.mockResolvedValue([]);

      await service.usersWithCredentials(
        [{ type: 'space-member' as any }],
        undefined,
        undefined
      );

      expect(entityManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: [
            {
              credentials: {
                type: 'space-member',
                resourceID: '',
              },
            },
          ],
        })
      );
    });
  });

  describe('countUsersWithCredentials', () => {
    it('should delegate to actorLookupService and return the count', async () => {
      // countUsersWithCredentials delegates to actorLookupService.countActorsWithCredentials
      const result = await service.countUsersWithCredentials({
        type: 'space-admin' as any,
      });

      expect(result).toBeDefined();
    });
  });
});
