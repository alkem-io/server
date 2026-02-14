import { EntityNotFoundException } from '@common/exceptions';
import { Credential } from '@domain/agent/credential/credential.entity';
import { CredentialService } from '@domain/agent/credential/credential.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Mock, vi } from 'vitest';

describe('CredentialService', () => {
  let service: CredentialService;
  let credentialRepository: Record<string, Mock>;

  beforeEach(async () => {
    // Mock the static BaseEntity.create method to avoid DataSource requirement
    vi.spyOn(Credential, 'create').mockImplementation((input: any) => {
      const cred = new Credential();
      Object.assign(cred, input);
      return cred as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        repositoryProviderMockFactory(Credential),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CredentialService);
    credentialRepository = module.get(getRepositoryToken(Credential));
  });

  describe('createCredential', () => {
    it('should create and save a credential from input data', async () => {
      const credentialInput = {
        type: 'global-admin',
        resourceID: 'resource-123',
      };

      const savedCredential = {
        id: 'cred-uuid-1',
        type: credentialInput.type,
        resourceID: credentialInput.resourceID,
      };

      credentialRepository.save.mockResolvedValue(savedCredential);

      const result = await service.createCredential(credentialInput);

      expect(credentialRepository.save).toHaveBeenCalledTimes(1);
      expect(result.type).toEqual(credentialInput.type);
      expect(result.resourceID).toEqual(credentialInput.resourceID);
    });

    it('should create a credential without optional resourceID', async () => {
      const credentialInput = {
        type: 'global-registered',
      };

      credentialRepository.save.mockResolvedValue({
        id: 'cred-uuid-2',
        type: credentialInput.type,
      });

      const result = await service.createCredential(credentialInput);

      expect(credentialRepository.save).toHaveBeenCalledTimes(1);
      expect(result.type).toEqual(credentialInput.type);
    });

    it('should create a credential with expiry and issuer', async () => {
      const expires = new Date('2025-12-31');
      const credentialInput = {
        type: 'global-admin',
        resourceID: 'resource-456',
        expires,
        issuer: 'issuer-uuid-1',
      };

      credentialRepository.save.mockResolvedValue({
        id: 'cred-uuid-3',
        ...credentialInput,
      });

      const result = await service.createCredential(credentialInput);

      expect(credentialRepository.save).toHaveBeenCalledTimes(1);
      expect(result.type).toEqual(credentialInput.type);
    });
  });

  describe('save', () => {
    it('should persist the credential via repository save', async () => {
      const credential = {
        id: 'cred-uuid-1',
        type: 'global-admin',
        resourceID: 'resource-123',
      } as Credential;

      const savedCredential = { ...credential };
      credentialRepository.save.mockResolvedValue(savedCredential);

      const result = await service.save(credential);

      expect(credentialRepository.save).toHaveBeenCalledWith(credential);
      expect(result).toEqual(savedCredential);
    });
  });

  describe('getCredentialOrFail', () => {
    it('should return the credential when it exists', async () => {
      const credentialId = 'cred-uuid-1';
      const existingCredential = {
        id: credentialId,
        type: 'global-admin',
        resourceID: 'resource-123',
      };

      credentialRepository.findOneBy.mockResolvedValue(existingCredential);

      const result = await service.getCredentialOrFail(credentialId);

      expect(credentialRepository.findOneBy).toHaveBeenCalledWith({
        id: credentialId,
      });
      expect(result).toEqual(existingCredential);
    });

    it('should throw EntityNotFoundException when credential does not exist', async () => {
      const credentialId = 'nonexistent-uuid';
      credentialRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.getCredentialOrFail(credentialId)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should include the credential ID in the exception message when not found', async () => {
      const credentialId = 'missing-cred-uuid';
      credentialRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.getCredentialOrFail(credentialId)
      ).rejects.toThrow(credentialId);
    });
  });

  describe('deleteCredential', () => {
    it('should delete the credential and return it with the original ID', async () => {
      const credentialId = 'cred-uuid-1';
      const existingCredential = {
        id: credentialId,
        type: 'global-admin',
        resourceID: 'resource-123',
      };

      credentialRepository.findOneBy.mockResolvedValue(existingCredential);
      // TypeORM remove clears the id, so the service reassigns it
      credentialRepository.remove.mockResolvedValue({ ...existingCredential, id: undefined });

      const result = await service.deleteCredential(credentialId);

      expect(credentialRepository.findOneBy).toHaveBeenCalledWith({
        id: credentialId,
      });
      expect(credentialRepository.remove).toHaveBeenCalledWith(existingCredential);
      expect(result.id).toEqual(credentialId);
    });

    it('should throw EntityNotFoundException when deleting a non-existent credential', async () => {
      const credentialId = 'nonexistent-uuid';
      credentialRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.deleteCredential(credentialId)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('findMatchingCredentials', () => {
    const createQueryBuilderMock = (results: Credential[]) => {
      const builder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(results),
      };
      return builder;
    };

    it('should find credentials matching type only when no resourceID is provided', async () => {
      const credentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: '' },
        { id: 'cred-2', type: 'global-admin', resourceID: 'res-1' },
      ] as Credential[];

      const qb = createQueryBuilderMock(credentials);
      credentialRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMatchingCredentials({
        type: 'global-admin',
      });

      expect(credentialRepository.createQueryBuilder).toHaveBeenCalledWith('credential');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('credential.agent', 'agent');
      expect(qb.where).toHaveBeenCalledWith({ type: 'global-admin' });
      expect(result).toEqual(credentials);
      expect(result).toHaveLength(2);
    });

    it('should find credentials matching both type and resourceID when resourceID is provided', async () => {
      const credentials = [
        { id: 'cred-2', type: 'global-admin', resourceID: 'res-1' },
      ] as Credential[];

      const qb = createQueryBuilderMock(credentials);
      credentialRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMatchingCredentials({
        type: 'global-admin',
        resourceID: 'res-1',
      });

      expect(qb.where).toHaveBeenCalledWith({
        type: 'global-admin',
        resourceID: 'res-1',
      });
      expect(result).toEqual(credentials);
      expect(result).toHaveLength(1);
    });

    it('should return an empty array when no credentials match', async () => {
      const qb = createQueryBuilderMock([]);
      credentialRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMatchingCredentials({
        type: 'nonexistent-type',
      });

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should treat empty string resourceID the same as undefined', async () => {
      const qb = createQueryBuilderMock([]);
      credentialRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findMatchingCredentials({
        type: 'global-admin',
        resourceID: '',
      });

      // Empty string is falsy, so it should query by type only
      expect(qb.where).toHaveBeenCalledWith({ type: 'global-admin' });
    });
  });

  describe('countMatchingCredentials', () => {
    const createQueryBuilderMock = (count: number) => {
      const builder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(count),
      };
      return builder;
    };

    it('should count credentials matching type only when no resourceID is provided', async () => {
      const qb = createQueryBuilderMock(5);
      credentialRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.countMatchingCredentials({
        type: 'global-admin',
      });

      expect(qb.where).toHaveBeenCalledWith({ type: 'global-admin' });
      expect(result).toEqual(5);
    });

    it('should count credentials matching both type and resourceID when resourceID is provided', async () => {
      const qb = createQueryBuilderMock(2);
      credentialRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.countMatchingCredentials({
        type: 'global-admin',
        resourceID: 'res-1',
      });

      expect(qb.where).toHaveBeenCalledWith({
        type: 'global-admin',
        resourceID: 'res-1',
      });
      expect(result).toEqual(2);
    });

    it('should return zero when no credentials match', async () => {
      const qb = createQueryBuilderMock(0);
      credentialRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.countMatchingCredentials({
        type: 'nonexistent-type',
      });

      expect(result).toEqual(0);
    });

    it('should treat empty string resourceID as no resourceID filter', async () => {
      const qb = createQueryBuilderMock(3);
      credentialRepository.createQueryBuilder.mockReturnValue(qb);

      await service.countMatchingCredentials({
        type: 'global-admin',
        resourceID: '',
      });

      // Empty string is falsy, so it should query by type only
      expect(qb.where).toHaveBeenCalledWith({ type: 'global-admin' });
    });
  });
});
