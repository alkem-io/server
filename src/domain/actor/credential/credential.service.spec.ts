import { EntityNotFoundException } from '@common/exceptions';
import { Test } from '@nestjs/testing';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { vi } from 'vitest';
import { Credential } from './credential.entity';
import { CredentialService } from './credential.service';

// Mock the static Credential.create() since it requires a DataSource
vi.spyOn(Credential, 'create').mockImplementation((input: any) => {
  const cred = new Credential();
  Object.assign(cred, input);
  return cred;
});

describe('CredentialService', () => {
  let service: CredentialService;
  let credentialRepository: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CredentialService, repositoryProviderMockFactory(Credential)],
    }).compile();

    service = module.get(CredentialService);
    credentialRepository = (service as any).credentialRepository;
  });

  describe('createCredential', () => {
    it('should create and save a credential', async () => {
      const input = { type: 'admin', resourceID: 'res-1' };
      credentialRepository.save.mockResolvedValue(undefined);

      const result = await service.createCredential(input);
      expect(result.type).toBe('admin');
      expect(credentialRepository.save).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should save and return credential', async () => {
      const credential = { id: 'cred-1', type: 'admin' } as any;
      credentialRepository.save.mockResolvedValue(credential);

      const result = await service.save(credential);
      expect(result).toBe(credential);
    });
  });

  describe('getCredentialOrFail', () => {
    it('should return credential when found', async () => {
      const credential = { id: 'cred-1' };
      credentialRepository.findOneBy.mockResolvedValue(credential);

      const result = await service.getCredentialOrFail('cred-1');
      expect(result).toBe(credential);
    });

    it('should throw when not found', async () => {
      credentialRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getCredentialOrFail('not-found')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('deleteCredential', () => {
    it('should delete and return credential with original ID', async () => {
      const credential = { id: 'cred-1' };
      credentialRepository.findOneBy.mockResolvedValue(credential);
      credentialRepository.remove.mockResolvedValue({
        ...credential,
        id: undefined,
      });

      const result = await service.deleteCredential('cred-1');
      expect(result.id).toBe('cred-1');
      expect(credentialRepository.remove).toHaveBeenCalled();
    });
  });

  describe('findMatchingCredentials', () => {
    let queryBuilder: any;

    beforeEach(() => {
      queryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn(),
      };
      credentialRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(queryBuilder);
    });

    it('should search by type only when no resourceID', async () => {
      const credentials = [{ id: 'cred-1' }];
      queryBuilder.getMany.mockResolvedValue(credentials);

      const result = await service.findMatchingCredentials({ type: 'admin' });
      expect(result).toEqual(credentials);
      expect(queryBuilder.where).toHaveBeenCalledWith({
        type: 'admin',
      });
    });

    it('should search by type and resourceID when provided', async () => {
      const credentials = [{ id: 'cred-1' }];
      queryBuilder.getMany.mockResolvedValue(credentials);

      const result = await service.findMatchingCredentials({
        type: 'admin',
        resourceID: 'res-1',
      });
      expect(result).toEqual(credentials);
      expect(queryBuilder.where).toHaveBeenCalledWith({
        type: 'admin',
        resourceID: 'res-1',
      });
    });
  });

  describe('countMatchingCredentials', () => {
    let queryBuilder: any;

    beforeEach(() => {
      queryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getCount: vi.fn(),
      };
      credentialRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(queryBuilder);
    });

    it('should count by type only when no resourceID', async () => {
      queryBuilder.getCount.mockResolvedValue(5);

      const result = await service.countMatchingCredentials({ type: 'admin' });
      expect(result).toBe(5);
    });

    it('should count by type and resourceID when provided', async () => {
      queryBuilder.getCount.mockResolvedValue(3);

      const result = await service.countMatchingCredentials({
        type: 'admin',
        resourceID: 'res-1',
      });
      expect(result).toBe(3);
    });
  });

  describe('countMatchingCredentialsBatch', () => {
    let queryBuilder: any;

    beforeEach(() => {
      queryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn(),
      };
      credentialRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(queryBuilder);
    });

    it('should return empty map for empty criteria list', async () => {
      const result = await service.countMatchingCredentialsBatch([]);
      expect(result.size).toBe(0);
    });

    it('should return map of resourceID to count', async () => {
      queryBuilder.getRawMany.mockResolvedValue([
        { resourceID: 'res-1', count: '3' },
        { resourceID: 'res-2', count: '7' },
      ]);

      const result = await service.countMatchingCredentialsBatch([
        { type: 'admin', resourceID: 'res-1' },
        { type: 'admin', resourceID: 'res-2' },
      ]);

      expect(result.get('res-1')).toBe(3);
      expect(result.get('res-2')).toBe(7);
    });

    it('should handle criteria without resourceID', async () => {
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.countMatchingCredentialsBatch([{ type: 'admin' }]);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        '(credential.type = :type0)',
        { type0: 'admin' }
      );
    });
  });

  describe('findCredentialsByActorID', () => {
    it('should find credentials by actor ID', async () => {
      const credentials = [{ id: 'cred-1' }];
      credentialRepository.find.mockResolvedValue(credentials);

      const result = await service.findCredentialsByActorID('actor-1');
      expect(result).toEqual(credentials);
      expect(credentialRepository.find).toHaveBeenCalledWith({
        where: { actorID: 'actor-1' },
      });
    });
  });

  describe('createCredentialForActor', () => {
    it('should create credential with actorID', async () => {
      credentialRepository.save.mockResolvedValue(undefined);

      const result = await service.createCredentialForActor('actor-1', {
        type: 'admin',
        resourceID: 'res-1',
      });

      expect(result.type).toBe('admin');
      expect(result.actorID).toBe('actor-1');
      expect(result.resourceID).toBe('res-1');
    });

    it('should default resourceID to empty string when not provided', async () => {
      credentialRepository.save.mockResolvedValue(undefined);

      const result = await service.createCredentialForActor('actor-1', {
        type: 'admin',
      });

      expect(result.resourceID).toBe('');
    });
  });

  describe('deleteCredentialByTypeAndResource', () => {
    it('should return true when credential deleted', async () => {
      credentialRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteCredentialByTypeAndResource(
        'actor-1',
        'admin',
        'res-1'
      );
      expect(result).toBe(true);
    });

    it('should return false when no credential deleted', async () => {
      credentialRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.deleteCredentialByTypeAndResource(
        'actor-1',
        'admin',
        'res-1'
      );
      expect(result).toBe(false);
    });

    it('should return false when affected is undefined', async () => {
      credentialRepository.delete.mockResolvedValue({});

      const result = await service.deleteCredentialByTypeAndResource(
        'actor-1',
        'admin',
        'res-1'
      );
      expect(result).toBe(false);
    });
  });
});
