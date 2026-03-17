import { ActorType } from '@common/enums/actor.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Test } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { ActorLookupService } from './actor.lookup.service';
import { ActorTypeCacheService } from './actor.lookup.service.cache';

// Valid UUID for test purposes
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '550e8400-e29b-41d4-a716-446655440001';
const _VALID_UUID_3 = '550e8400-e29b-41d4-a716-446655440002';

describe('ActorLookupService', () => {
  let service: ActorLookupService;
  let entityManager: any;
  let actorTypeCacheService: any;

  beforeEach(async () => {
    entityManager = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
    };

    actorTypeCacheService = {
      getActorType: vi.fn(),
      setActorType: vi.fn(),
      getActorTypes: vi.fn(),
      setActorTypes: vi.fn(),
      deleteActorType: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActorLookupService,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        {
          provide: ActorTypeCacheService,
          useValue: actorTypeCacheService,
        },
      ],
    }).compile();

    service = module.get(ActorLookupService);
  });

  describe('getActorTypeById', () => {
    it('should return null for invalid UUID', async () => {
      const result = await service.getActorTypeById('not-a-uuid');
      expect(result).toBeNull();
    });

    it('should return cached type without DB query', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(ActorType.USER);

      const result = await service.getActorTypeById(VALID_UUID);
      expect(result).toBe(ActorType.USER);
      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('should query DB and cache result when not cached', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue({ type: ActorType.ORGANIZATION });
      actorTypeCacheService.setActorType.mockResolvedValue(undefined);

      const result = await service.getActorTypeById(VALID_UUID);
      expect(result).toBe(ActorType.ORGANIZATION);
      expect(actorTypeCacheService.setActorType).toHaveBeenCalledWith(
        VALID_UUID,
        ActorType.ORGANIZATION
      );
    });

    it('should return null when not in cache or DB', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getActorTypeById(VALID_UUID);
      expect(result).toBeNull();
    });
  });

  describe('isType', () => {
    it('should return true when actor matches one of the types', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(ActorType.USER);

      const result = await service.isType(
        VALID_UUID,
        ActorType.USER,
        ActorType.ORGANIZATION
      );
      expect(result).toBe(true);
    });

    it('should return false when actor does not match', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(ActorType.SPACE);

      const result = await service.isType(VALID_UUID, ActorType.USER);
      expect(result).toBe(false);
    });

    it('should return false when actor type is null', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.isType(VALID_UUID, ActorType.USER);
      expect(result).toBe(false);
    });
  });

  describe('actorExists', () => {
    it('should return false for invalid UUID', async () => {
      const result = await service.actorExists('not-a-uuid');
      expect(result).toBe(false);
    });

    it('should return true when count > 0', async () => {
      entityManager.count.mockResolvedValue(1);

      const result = await service.actorExists(VALID_UUID);
      expect(result).toBe(true);
    });

    it('should return false when count is 0', async () => {
      entityManager.count.mockResolvedValue(0);

      const result = await service.actorExists(VALID_UUID);
      expect(result).toBe(false);
    });
  });

  describe('getFullActorById', () => {
    it('should return null for invalid UUID', async () => {
      const result = await service.getFullActorById('not-a-uuid');
      expect(result).toBeNull();
    });

    it('should return null when type not found', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getFullActorById(VALID_UUID);
      expect(result).toBeNull();
    });

    it('should query User table for USER type', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(ActorType.USER);
      const user = { id: VALID_UUID, type: ActorType.USER };
      entityManager.findOne.mockResolvedValue(user);

      const result = await service.getFullActorById(VALID_UUID);
      expect(result).toBe(user);
    });

    it('should query Organization table for ORGANIZATION type', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(
        ActorType.ORGANIZATION
      );
      const org = { id: VALID_UUID, type: ActorType.ORGANIZATION };
      entityManager.findOne.mockResolvedValue(org);

      const result = await service.getFullActorById(VALID_UUID);
      expect(result).toBe(org);
    });

    it('should query VirtualContributor table for VIRTUAL_CONTRIBUTOR type', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(
        ActorType.VIRTUAL_CONTRIBUTOR
      );
      const vc = { id: VALID_UUID, type: ActorType.VIRTUAL_CONTRIBUTOR };
      entityManager.findOne.mockResolvedValue(vc);

      const result = await service.getFullActorById(VALID_UUID);
      expect(result).toBe(vc);
    });

    it('should query Space table for SPACE type', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(ActorType.SPACE);
      const space = { id: VALID_UUID, type: ActorType.SPACE };
      entityManager.findOne.mockResolvedValue(space);

      const result = await service.getFullActorById(VALID_UUID);
      expect(result).toBe(space);
    });

    it('should query Account table for ACCOUNT type', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(ActorType.ACCOUNT);
      const account = { id: VALID_UUID, type: ActorType.ACCOUNT };
      entityManager.findOne.mockResolvedValue(account);

      const result = await service.getFullActorById(VALID_UUID);
      expect(result).toBe(account);
    });
  });

  describe('getFullActorByIdOrFail', () => {
    it('should return actor when found', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(ActorType.USER);
      const user = { id: VALID_UUID };
      entityManager.findOne.mockResolvedValue(user);

      const result = await service.getFullActorByIdOrFail(VALID_UUID);
      expect(result).toBe(user);
    });

    it('should throw when not found', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getFullActorByIdOrFail(VALID_UUID)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getActorTypeByIdOrFail', () => {
    it('should return type when found', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(ActorType.USER);

      const result = await service.getActorTypeByIdOrFail(VALID_UUID);
      expect(result).toBe(ActorType.USER);
    });

    it('should throw when type not found', async () => {
      actorTypeCacheService.getActorType.mockResolvedValue(undefined);
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getActorTypeByIdOrFail(VALID_UUID)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('validateActorsAndGetTypes', () => {
    it('should return empty map for empty input', async () => {
      const result = await service.validateActorsAndGetTypes([]);
      expect(result.size).toBe(0);
    });

    it('should throw for invalid UUID format', async () => {
      await expect(
        service.validateActorsAndGetTypes(['not-a-uuid'])
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return cached types without DB query', async () => {
      const cachedMap = new Map([[VALID_UUID, ActorType.USER]]);
      actorTypeCacheService.getActorTypes.mockResolvedValue(cachedMap);

      const result = await service.validateActorsAndGetTypes([VALID_UUID]);
      expect(result).toBe(cachedMap);
      expect(entityManager.find).not.toHaveBeenCalled();
    });

    it('should query DB for uncached IDs and cache results', async () => {
      const cachedMap = new Map([[VALID_UUID, ActorType.USER]]);
      actorTypeCacheService.getActorTypes.mockResolvedValue(cachedMap);
      entityManager.find.mockResolvedValue([
        { id: VALID_UUID_2, type: ActorType.ORGANIZATION },
      ]);
      actorTypeCacheService.setActorTypes.mockResolvedValue(undefined);

      const result = await service.validateActorsAndGetTypes([
        VALID_UUID,
        VALID_UUID_2,
      ]);

      expect(result.size).toBe(2);
      expect(result.get(VALID_UUID)).toBe(ActorType.USER);
      expect(result.get(VALID_UUID_2)).toBe(ActorType.ORGANIZATION);
    });

    it('should throw when some actors not found in DB', async () => {
      actorTypeCacheService.getActorTypes.mockResolvedValue(new Map());
      entityManager.find.mockResolvedValue([]); // none found

      await expect(
        service.validateActorsAndGetTypes([VALID_UUID])
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getActorAuthorizationOrFail', () => {
    it('should throw for invalid UUID', async () => {
      await expect(
        service.getActorAuthorizationOrFail('not-a-uuid')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when actor not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getActorAuthorizationOrFail(VALID_UUID)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when authorization not initialized', async () => {
      entityManager.findOne.mockResolvedValue({
        id: VALID_UUID,
        authorization: null,
      });

      await expect(
        service.getActorAuthorizationOrFail(VALID_UUID)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should return authorization when present', async () => {
      const auth = { id: 'auth-1' };
      entityManager.findOne.mockResolvedValue({
        id: VALID_UUID,
        authorization: auth,
      });

      const result = await service.getActorAuthorizationOrFail(VALID_UUID);
      expect(result).toBe(auth);
    });
  });

  describe('getActorById', () => {
    it('should return null for invalid UUID', async () => {
      const result = await service.getActorById('not-a-uuid');
      expect(result).toBeNull();
    });

    it('should return actor with profile relation by default', async () => {
      const actor = { id: VALID_UUID };
      entityManager.findOne.mockResolvedValue(actor);

      const result = await service.getActorById(VALID_UUID);
      expect(result).toBe(actor);
      expect(entityManager.findOne).toHaveBeenCalledWith(Actor, {
        where: { id: VALID_UUID },
        relations: { profile: true },
      });
    });

    it('should merge additional relations', async () => {
      const actor = { id: VALID_UUID };
      entityManager.findOne.mockResolvedValue(actor);

      await service.getActorById(VALID_UUID, {
        relations: { credentials: true },
      });
      expect(entityManager.findOne).toHaveBeenCalledWith(Actor, {
        where: { id: VALID_UUID },
        relations: { profile: true, credentials: true },
      });
    });
  });

  describe('getActorByIdOrFail', () => {
    it('should return actor when found', async () => {
      const actor = { id: VALID_UUID };
      entityManager.findOne.mockResolvedValue(actor);

      const result = await service.getActorByIdOrFail(VALID_UUID);
      expect(result).toBe(actor);
    });

    it('should throw when not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getActorByIdOrFail(VALID_UUID)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getActorCredentials', () => {
    it('should return empty array for invalid UUID', async () => {
      const result = await service.getActorCredentials('not-a-uuid');
      expect(result).toEqual([]);
    });

    it('should return credentials when actor found', async () => {
      const credentials = [{ id: 'cred-1' }];
      entityManager.findOne.mockResolvedValue({
        id: VALID_UUID,
        credentials,
      });

      const result = await service.getActorCredentials(VALID_UUID);
      expect(result).toEqual(credentials);
    });

    it('should return empty array when actor not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getActorCredentials(VALID_UUID);
      expect(result).toEqual([]);
    });

    it('should return empty array when credentials is undefined', async () => {
      entityManager.findOne.mockResolvedValue({ id: VALID_UUID });

      const result = await service.getActorCredentials(VALID_UUID);
      expect(result).toEqual([]);
    });
  });

  describe('getActorCredentialsOrFail', () => {
    it('should throw for invalid UUID', async () => {
      await expect(
        service.getActorCredentialsOrFail('not-a-uuid')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when actor not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getActorCredentialsOrFail(VALID_UUID)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return credentials when found', async () => {
      const credentials = [{ id: 'cred-1' }];
      entityManager.findOne.mockResolvedValue({
        id: VALID_UUID,
        credentials,
      });

      const result = await service.getActorCredentialsOrFail(VALID_UUID);
      expect(result).toEqual(credentials);
    });

    it('should return empty array when credentials is undefined', async () => {
      entityManager.findOne.mockResolvedValue({ id: VALID_UUID });

      const result = await service.getActorCredentialsOrFail(VALID_UUID);
      expect(result).toEqual([]);
    });
  });

  describe('actorsWithCredentials', () => {
    it('should query actors with credential criteria', async () => {
      const actors = [{ id: VALID_UUID }];
      entityManager.find.mockResolvedValue(actors);

      const result = await service.actorsWithCredentials({
        type: 'admin',
        resourceID: 'res-1',
      });
      expect(result).toEqual(actors);
    });

    it('should include actorTypes filter when provided', async () => {
      entityManager.find.mockResolvedValue([]);

      await service.actorsWithCredentials(
        { type: 'admin' },
        [ActorType.USER],
        10
      );

      expect(entityManager.find).toHaveBeenCalledWith(
        Actor,
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });

  describe('getActorIDsWithCredential', () => {
    it('should return array of actor IDs', async () => {
      entityManager.find.mockResolvedValue([
        { id: VALID_UUID },
        { id: VALID_UUID_2 },
      ]);

      const result = await service.getActorIDsWithCredential({
        type: 'admin',
      });
      expect(result).toEqual([VALID_UUID, VALID_UUID_2]);
    });
  });

  describe('countActorsWithCredentials', () => {
    it('should return count from entity manager', async () => {
      entityManager.count.mockResolvedValue(5);

      const result = await service.countActorsWithCredentials({
        type: 'admin',
      });
      expect(result).toBe(5);
    });
  });

  describe('getActorsManagedByUser', () => {
    it('should throw when user not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getActorsManagedByUser(VALID_UUID)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should return user, managed orgs, and VCs', async () => {
      const user = { id: VALID_UUID, accountID: 'account-1' };
      const orgCredentials = [{ resourceID: 'org-1' }, { resourceID: 'org-2' }];
      const orgs = [
        { id: 'org-1', accountID: 'account-2' },
        { id: 'org-2', accountID: 'account-3' },
      ];
      const vcs = [{ id: 'vc-1' }];

      entityManager.findOne.mockResolvedValue(user);
      entityManager.find
        .mockResolvedValueOnce(orgCredentials) // credential query
        .mockResolvedValueOnce(orgs) // org query
        .mockResolvedValueOnce(vcs); // vc query

      const result = await service.getActorsManagedByUser(VALID_UUID);
      expect(result).toEqual([user, ...orgs, ...vcs]);
    });

    it('should handle user with no managed orgs', async () => {
      const user = { id: VALID_UUID, accountID: 'account-1' };

      entityManager.findOne.mockResolvedValue(user);
      entityManager.find
        .mockResolvedValueOnce([]) // no org credentials
        .mockResolvedValueOnce([]); // VCs for user's account

      const result = await service.getActorsManagedByUser(VALID_UUID);
      expect(result).toEqual([user]);
    });
  });
});
