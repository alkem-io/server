import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { UserLookupService } from './user.lookup.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('UserLookupService', () => {
  let service: UserLookupService;
  let db: any;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLookupService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(UserLookupService);
    db = module.get(DRIZZLE);
  });

  describe('getUserByUUID', () => {
    it('should return null when the provided ID is not a valid UUID', async () => {
      const result = await service.getUserByUUID('not-a-uuid');
      expect(result).toBeNull();

    });

    it('should query the entity manager and return the user when a valid UUID is provided', async () => {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'test@example.com',
      };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      const result = await service.getUserByUUID(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toBe(mockUser);
      expect(db.query.users.findFirst).toHaveBeenCalled();
    });

    it('should return null when the entity manager finds no user', async () => {

      const result = await service.getUserByUUID(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toBeNull();
    });
  });

  describe('getUsersByUUID', () => {
    it('should return an empty array when all provided IDs are invalid UUIDs', async () => {
      const result = await service.getUsersByUUID([
        'not-a-uuid',
        'also-invalid',
      ]);
      expect(result).toEqual([]);

    });

    it('should filter out invalid UUIDs and query only valid ones', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockUsers = [{ id: validId }];
      db.query.users.findMany.mockResolvedValueOnce(mockUsers);

      const result = await service.getUsersByUUID([validId, 'invalid-id']);

      expect(result).toEqual(mockUsers);
    });

    it('should return an empty array when given an empty array of IDs', async () => {
      const result = await service.getUsersByUUID([]);
      expect(result).toEqual([]);

    });
  });

  describe('getUserByEmail', () => {
    it('should convert the email to lowercase before querying', async () => {

      await service.getUserByEmail('Test@Example.COM');

      expect(db.query.users.findFirst).toHaveBeenCalled();
    });
  });

  describe('getUserOrFail', () => {
    it('should return the user when found by UUID', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockUser = { id: validId };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      const result = await service.getUserOrFail(validId);
      expect(result).toBe(mockUser);
    });

    it('should throw EntityNotFoundException when user is not found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      await expect(service.getUserOrFail(validId)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when an invalid UUID is provided', async () => {
      await expect(service.getUserOrFail('not-a-uuid')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getUserByNameIdOrFail', () => {
    it('should return the user when found by nameID', async () => {
      const mockUser = { id: 'user-1', nameID: 'john-doe' };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      const result = await service.getUserByNameIdOrFail('john-doe');
      expect(result).toBe(mockUser);
    });

    it('should throw EntityNotFoundException when no user matches the nameID', async () => {

      await expect(
        service.getUserByNameIdOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('isRegisteredUser', () => {
    it('should return true when a user with the given email exists', async () => {
      db.query.users.findFirst.mockResolvedValueOnce({ id: 'user-1', email: 'test@example.com' });

      const result = await service.isRegisteredUser('test@example.com');
      expect(result).toBe(true);
    });

    it('should return false when no user with the given email exists', async () => {

      const result = await service.isRegisteredUser('unknown@example.com');
      expect(result).toBe(false);
    });
  });

  describe('getUserAndCredentials', () => {
    it('should return user and credentials when agent is initialized', async () => {
      const mockCredentials = [{ type: 'space-admin', resourceID: 'space-1' }];
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        agent: { id: 'agent-1', credentials: mockCredentials },
      };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      const result = await service.getUserAndCredentials(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
      expect(result.user).toBe(mockUser);
      expect(result.credentials).toBe(mockCredentials);
    });

    it('should throw EntityNotInitializedException when the user agent is not loaded', async () => {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        agent: undefined,
      };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      await expect(
        service.getUserAndCredentials('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when agent credentials are not loaded', async () => {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        agent: { id: 'agent-1', credentials: undefined },
      };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      await expect(
        service.getUserAndCredentials('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getUserAndAgent', () => {
    it('should return user and agent when agent is initialized', async () => {
      const mockAgent = { id: 'agent-1' };
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        agent: mockAgent,
      };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      const result = await service.getUserAndAgent(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
      expect(result.user).toBe(mockUser);
      expect(result.agent).toBe(mockAgent);
    });

    it('should throw EntityNotInitializedException when the user agent is not initialized', async () => {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        agent: undefined,
      };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      await expect(
        service.getUserAndAgent('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getUserWithAgent', () => {
    it('should return user when agent and credentials are loaded', async () => {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        agent: { id: 'agent-1', credentials: [] },
      };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      const result = await service.getUserWithAgent(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
      expect(result).toBe(mockUser);
    });

    it('should throw EntityNotInitializedException when agent is missing', async () => {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        agent: undefined,
      };
      db.query.users.findFirst.mockResolvedValueOnce(mockUser);

      await expect(
        service.getUserWithAgent('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
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

    });

    it('should default resourceID to empty string when not provided in criteria', async () => {
      // The selectDistinct chain needs to resolve to an array
      db.limit.mockResolvedValueOnce([]);

      await service.usersWithCredentials(
        [{ type: 'space-member' as any }],
        undefined,
        undefined
      );

      expect(db.selectDistinct).toHaveBeenCalled();
    });
  });

  describe('countUsersWithCredentials', () => {
    it('should default resourceID to empty string when not provided', async () => {
      // The select chain terminal (where) needs to resolve to an array with count
      db.where.mockResolvedValueOnce([{ count: 5 }]);

      const result = await service.countUsersWithCredentials({
        type: 'space-admin' as any,
      });

      expect(result).toBe(5);
    });
  });
});
