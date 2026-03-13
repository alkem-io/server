import { ActorType } from '@common/enums/actor.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import { ActorTypeCacheService } from '@domain/actor/actor-lookup/actor.lookup.service.cache';
import { CredentialService } from '@domain/actor/credential';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mocked, vi } from 'vitest';
import { Actor } from './actor.entity';
import { ActorService, getActorType } from './actor.service';

describe('getActorType', () => {
  it('should return the actor type when present', () => {
    const actor = { id: 'actor-1', type: ActorType.USER } as any;
    expect(getActorType(actor)).toBe(ActorType.USER);
  });

  it('should throw EntityNotInitializedException when type is not set', () => {
    const actor = { id: 'actor-1', type: undefined } as any;
    expect(() => getActorType(actor)).toThrow(EntityNotInitializedException);
  });

  it('should throw EntityNotInitializedException when type is empty string', () => {
    const actor = { id: 'actor-1', type: '' } as any;
    expect(() => getActorType(actor)).toThrow(EntityNotInitializedException);
  });
});

describe('ActorService', () => {
  let service: ActorService;
  let actorRepository: any;
  let credentialService: Mocked<CredentialService>;
  let cacheManager: any;
  let actorContextCacheService: Mocked<ActorContextCacheService>;
  let actorTypeCacheService: Mocked<ActorTypeCacheService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ActorService,
        repositoryProviderMockFactory(Actor),
        MockWinstonProvider,
        MockCacheManager,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue(300),
          },
        },
        {
          provide: CredentialService,
          useValue: {
            findMatchingCredentials: vi.fn(),
            countMatchingCredentials: vi.fn(),
            countMatchingCredentialsBatch: vi.fn(),
            createCredentialForActor: vi.fn(),
            deleteCredentialByTypeAndResource: vi.fn(),
          },
        },
        {
          provide: ActorContextCacheService,
          useValue: {
            deleteByActorID: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ActorTypeCacheService,
          useValue: {
            deleteActorType: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(ActorService);
    actorRepository = module.get(
      `${Actor.name}Repository` === 'ActorRepository'
        ? 'ActorRepository'
        : 'ActorRepository'
    );
    // Access the repository directly from the service for mocking
    actorRepository = (service as any).actorRepository;
    credentialService = module.get(CredentialService);
    cacheManager = module.get('CACHE_MANAGER');
    actorContextCacheService = module.get(ActorContextCacheService);
    actorTypeCacheService = module.get(ActorTypeCacheService);
  });

  describe('getActorOrFail', () => {
    it('should return actor when found', async () => {
      const actor = { id: 'actor-1', type: ActorType.USER };
      actorRepository.findOne.mockResolvedValue(actor);

      const result = await service.getActorOrFail('actor-1');
      expect(result).toBe(actor);
      expect(actorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'actor-1' },
      });
    });

    it('should pass options to findOne', async () => {
      const actor = { id: 'actor-1', type: ActorType.USER };
      actorRepository.findOne.mockResolvedValue(actor);

      await service.getActorOrFail('actor-1', {
        relations: { credentials: true },
      });
      expect(actorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'actor-1' },
        relations: { credentials: true },
      });
    });

    it('should throw EntityNotFoundException when not found', async () => {
      actorRepository.findOne.mockResolvedValue(null);

      await expect(service.getActorOrFail('not-found')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getActorOrNull', () => {
    it('should return actor when found', async () => {
      const actor = { id: 'actor-1' };
      actorRepository.findOne.mockResolvedValue(actor);

      const result = await service.getActorOrNull('actor-1');
      expect(result).toBe(actor);
    });

    it('should return null when not found', async () => {
      actorRepository.findOne.mockResolvedValue(null);

      const result = await service.getActorOrNull('not-found');
      expect(result).toBeNull();
    });
  });

  describe('saveActor', () => {
    it('should save and return the actor', async () => {
      const actor = { id: 'actor-1' } as any;
      actorRepository.save.mockResolvedValue(actor);

      const result = await service.saveActor(actor);
      expect(result).toBe(actor);
      expect(actorRepository.save).toHaveBeenCalledWith(actor);
    });
  });

  describe('deleteActorById', () => {
    it('should delete actor and invalidate all caches', async () => {
      actorRepository.delete.mockResolvedValue({ affected: 1 });
      cacheManager.del.mockResolvedValue(undefined);

      await service.deleteActorById('actor-1');

      expect(actorRepository.delete).toHaveBeenCalledWith('actor-1');
      expect(cacheManager.del).toHaveBeenCalledWith('@actor:id:actor-1');
      expect(actorContextCacheService.deleteByActorID).toHaveBeenCalledWith(
        'actor-1'
      );
      expect(actorTypeCacheService.deleteActorType).toHaveBeenCalledWith(
        'actor-1'
      );
    });

    it('should not throw if cache invalidation fails', async () => {
      actorRepository.delete.mockResolvedValue({ affected: 1 });
      cacheManager.del.mockRejectedValue(new Error('Redis down'));

      await expect(service.deleteActorById('actor-1')).resolves.toBeUndefined();
    });
  });

  describe('getActorCredentials', () => {
    it('should return cached actor credentials when available', async () => {
      const credentials = [{ id: 'cred-1', type: 'admin' }];
      const actor = { id: 'actor-1', credentials };
      cacheManager.get.mockResolvedValue(actor);

      const result = await service.getActorCredentials('actor-1');
      expect(result).toEqual({ actor, credentials });
      expect(actorRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache when cache misses', async () => {
      const credentials = [{ id: 'cred-1', type: 'admin' }];
      const actor = { id: 'actor-1', credentials };
      cacheManager.get.mockResolvedValue(undefined);
      actorRepository.findOne.mockResolvedValue(actor);
      cacheManager.set.mockResolvedValue(actor);

      const result = await service.getActorCredentials('actor-1');
      expect(result).toEqual({ actor, credentials });
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should fetch from DB when cached actor has no credentials', async () => {
      const cachedActor = { id: 'actor-1' }; // no credentials property
      const dbActor = {
        id: 'actor-1',
        credentials: [{ id: 'cred-1' }],
      };
      cacheManager.get.mockResolvedValue(cachedActor);
      actorRepository.findOne.mockResolvedValue(dbActor);
      cacheManager.set.mockResolvedValue(dbActor);

      const result = await service.getActorCredentials('actor-1');
      expect(result.credentials).toEqual(dbActor.credentials);
    });

    it('should throw when actor credentials not initialized after DB fetch', async () => {
      const actor = { id: 'actor-1' }; // no credentials
      cacheManager.get.mockResolvedValue(undefined);
      actorRepository.findOne.mockResolvedValue(actor);
      cacheManager.set.mockResolvedValue(actor);

      await expect(service.getActorCredentials('actor-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('findActorsWithMatchingCredentials', () => {
    it('should return actors from matching credentials', async () => {
      const actor1 = { id: 'actor-1' };
      const actor2 = { id: 'actor-2' };
      credentialService.findMatchingCredentials.mockResolvedValue([
        { actor: actor1 },
        { actor: actor2 },
        { actor: null }, // credential without actor
      ] as any);

      const result = await service.findActorsWithMatchingCredentials({
        type: 'admin',
      });
      expect(result).toEqual([actor1, actor2]);
    });

    it('should return empty array when no matches', async () => {
      credentialService.findMatchingCredentials.mockResolvedValue([]);

      const result = await service.findActorsWithMatchingCredentials({
        type: 'admin',
      });
      expect(result).toEqual([]);
    });
  });

  describe('hasValidCredential', () => {
    it('should return true when matching credential found by type only', async () => {
      const credentials = [{ type: 'admin', resourceID: '' }];
      const actor = { id: 'actor-1', credentials };
      cacheManager.get.mockResolvedValue(actor);

      const result = await service.hasValidCredential('actor-1', {
        type: 'admin',
      });
      expect(result).toBe(true);
    });

    it('should return true when matching credential found by type and resourceID', async () => {
      const credentials = [{ type: 'admin', resourceID: 'res-1' }];
      const actor = { id: 'actor-1', credentials };
      cacheManager.get.mockResolvedValue(actor);

      const result = await service.hasValidCredential('actor-1', {
        type: 'admin',
        resourceID: 'res-1',
      });
      expect(result).toBe(true);
    });

    it('should return false when no matching credential', async () => {
      const credentials = [{ type: 'member', resourceID: '' }];
      const actor = { id: 'actor-1', credentials };
      cacheManager.get.mockResolvedValue(actor);

      const result = await service.hasValidCredential('actor-1', {
        type: 'admin',
      });
      expect(result).toBe(false);
    });

    it('should return false when resourceID does not match', async () => {
      const credentials = [{ type: 'admin', resourceID: 'res-1' }];
      const actor = { id: 'actor-1', credentials };
      cacheManager.get.mockResolvedValue(actor);

      const result = await service.hasValidCredential('actor-1', {
        type: 'admin',
        resourceID: 'res-2',
      });
      expect(result).toBe(false);
    });
  });

  describe('countActorsWithMatchingCredentials', () => {
    it('should delegate to credentialService', async () => {
      credentialService.countMatchingCredentials.mockResolvedValue(5);

      const result = await service.countActorsWithMatchingCredentials({
        type: 'admin',
      });
      expect(result).toBe(5);
    });
  });

  describe('countActorsWithMatchingCredentialsBatch', () => {
    it('should delegate to credentialService', async () => {
      const map = new Map([['res-1', 3]]);
      credentialService.countMatchingCredentialsBatch.mockResolvedValue(map);

      const result = await service.countActorsWithMatchingCredentialsBatch([
        { type: 'admin', resourceID: 'res-1' },
      ]);
      expect(result).toBe(map);
    });
  });

  describe('grantCredentialOrFail', () => {
    it('should verify actor, create credential, and invalidate cache', async () => {
      const actor = { id: 'actor-1' };
      const credential = { id: 'cred-1', type: 'admin' };
      actorRepository.findOne.mockResolvedValue(actor);
      credentialService.createCredentialForActor.mockResolvedValue(
        credential as any
      );
      cacheManager.del.mockResolvedValue(undefined);

      const result = await service.grantCredentialOrFail('actor-1', {
        type: 'admin',
      });

      expect(result).toBe(credential);
      expect(actorRepository.findOne).toHaveBeenCalled();
      expect(credentialService.createCredentialForActor).toHaveBeenCalledWith(
        'actor-1',
        { type: 'admin' }
      );
      expect(cacheManager.del).toHaveBeenCalledWith('@actor:id:actor-1');
      expect(actorContextCacheService.deleteByActorID).toHaveBeenCalledWith(
        'actor-1'
      );
    });

    it('should throw when actor not found', async () => {
      actorRepository.findOne.mockResolvedValue(null);

      await expect(
        service.grantCredentialOrFail('not-found', { type: 'admin' })
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('revokeCredential', () => {
    it('should verify actor, delete credential, invalidate cache, and return true', async () => {
      const actor = { id: 'actor-1' };
      actorRepository.findOne.mockResolvedValue(actor);
      credentialService.deleteCredentialByTypeAndResource.mockResolvedValue(
        true
      );
      cacheManager.del.mockResolvedValue(undefined);

      const result = await service.revokeCredential('actor-1', {
        type: 'admin',
        resourceID: 'res-1',
      });

      expect(result).toBe(true);
      expect(
        credentialService.deleteCredentialByTypeAndResource
      ).toHaveBeenCalledWith('actor-1', 'admin', 'res-1');
      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('should return false and skip cache invalidation when credential not found', async () => {
      const actor = { id: 'actor-1' };
      actorRepository.findOne.mockResolvedValue(actor);
      credentialService.deleteCredentialByTypeAndResource.mockResolvedValue(
        false
      );

      const result = await service.revokeCredential('actor-1', {
        type: 'admin',
      });

      expect(result).toBe(false);
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('should use empty string as resourceID when not provided', async () => {
      const actor = { id: 'actor-1' };
      actorRepository.findOne.mockResolvedValue(actor);
      credentialService.deleteCredentialByTypeAndResource.mockResolvedValue(
        true
      );
      cacheManager.del.mockResolvedValue(undefined);

      await service.revokeCredential('actor-1', { type: 'admin' });

      expect(
        credentialService.deleteCredentialByTypeAndResource
      ).toHaveBeenCalledWith('actor-1', 'admin', '');
    });

    it('should throw when actor not found', async () => {
      actorRepository.findOne.mockResolvedValue(null);

      await expect(
        service.revokeCredential('not-found', { type: 'admin' })
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
