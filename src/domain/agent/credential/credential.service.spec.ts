import { EntityNotFoundException } from '@common/exceptions';
import { Credential } from '@domain/agent/credential/credential.entity';
import { CredentialService } from '@domain/agent/credential/credential.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('CredentialService', () => {
  let service: CredentialService;
  let db: any;
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
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CredentialService);
    db = module.get(DRIZZLE);
  });

  describe('createCredential', () => {
    it('should create and save a credential from input data', async () => {
      const credentialInput = {
        type: 'global-admin',
        resourceID: 'resource-123',
      };

      db.returning.mockResolvedValueOnce([credentialInput]);

      const result = await service.createCredential(credentialInput);

      expect(result.type).toEqual(credentialInput.type);
      expect(result.resourceID).toEqual(credentialInput.resourceID);
    });

    it('should create a credential without optional resourceID', async () => {
      const credentialInput = {
        type: 'global-registered',
      };

      db.returning.mockResolvedValueOnce([credentialInput]);

      const result = await service.createCredential(credentialInput);

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

      db.returning.mockResolvedValueOnce([credentialInput]);

      const result = await service.createCredential(credentialInput);

      expect(result.type).toEqual(credentialInput.type);
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

      db.query.credentials.findFirst.mockResolvedValue(existingCredential);

      const result = await service.getCredentialOrFail(credentialId);

      expect(result).toEqual(existingCredential);
    });

    it('should throw EntityNotFoundException when credential does not exist', async () => {
      const credentialId = 'nonexistent-uuid';
      db.query.credentials.findFirst.mockResolvedValue(null);

      await expect(service.getCredentialOrFail(credentialId)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should include the credential ID in the exception message when not found', async () => {
      const credentialId = 'missing-cred-uuid';
      db.query.credentials.findFirst.mockResolvedValue(null);

      await expect(service.getCredentialOrFail(credentialId)).rejects.toThrow(
        credentialId
      );
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

      db.query.credentials.findFirst.mockResolvedValue(existingCredential);

      const result = await service.deleteCredential(credentialId);

      expect(result.id).toEqual(credentialId);
    });

    it('should throw EntityNotFoundException when deleting a non-existent credential', async () => {
      const credentialId = 'nonexistent-uuid';
      db.query.credentials.findFirst.mockResolvedValue(null);

      await expect(service.deleteCredential(credentialId)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('findMatchingCredentials', () => {
    it('should find credentials matching type only when no resourceID is provided', async () => {
      const matchingCredentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: '' },
        { id: 'cred-2', type: 'global-admin', resourceID: 'res-1' },
      ];
      db.query.credentials.findMany.mockResolvedValueOnce(matchingCredentials);

      const result = await service.findMatchingCredentials({
        type: 'global-admin',
      });

      expect(result).toEqual(matchingCredentials);
      expect(result).toHaveLength(2);
    });

    it('should find credentials matching both type and resourceID when resourceID is provided', async () => {
      const matchingCredentials = [
        { id: 'cred-2', type: 'global-admin', resourceID: 'res-1' },
      ];
      db.query.credentials.findMany.mockResolvedValueOnce(matchingCredentials);

      const result = await service.findMatchingCredentials({
        type: 'global-admin',
        resourceID: 'res-1',
      });

      expect(result).toEqual(matchingCredentials);
      expect(result).toHaveLength(1);
    });

    it('should return an empty array when no credentials match', async () => {
      db.query.credentials.findMany.mockResolvedValueOnce([]);

      const result = await service.findMatchingCredentials({
        type: 'nonexistent-type',
      });

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should treat empty string resourceID the same as undefined', async () => {
      db.query.credentials.findMany.mockResolvedValueOnce([]);

      const result = await service.findMatchingCredentials({
        type: 'global-admin',
        resourceID: '',
      });

      // Empty string is falsy, so it should query by type only
      expect(result).toEqual([]);
      expect(db.query.credentials.findMany).toHaveBeenCalled();
    });
  });

  describe('countMatchingCredentials', () => {
    it('should count credentials matching type only when no resourceID is provided', async () => {
      // db.select().from().where() chain - where is the terminal
      db.where.mockResolvedValueOnce([{ count: 5 }]);

      const result = await service.countMatchingCredentials({
        type: 'global-admin',
      });

      expect(result).toEqual(5);
    });

    it('should count credentials matching both type and resourceID when resourceID is provided', async () => {
      db.where.mockResolvedValueOnce([{ count: 2 }]);

      const result = await service.countMatchingCredentials({
        type: 'global-admin',
        resourceID: 'res-1',
      });

      expect(result).toEqual(2);
    });

    it('should return zero when no credentials match', async () => {
      db.where.mockResolvedValueOnce([{ count: 0 }]);

      const result = await service.countMatchingCredentials({
        type: 'nonexistent-type',
      });

      expect(result).toEqual(0);
    });

    it('should treat empty string resourceID as no resourceID filter', async () => {
      db.where.mockResolvedValueOnce([{ count: 3 }]);

      const result = await service.countMatchingCredentials({
        type: 'global-admin',
        resourceID: '',
      });

      expect(result).toBe(3);
    });
  });

  describe('countMatchingCredentialsBatch', () => {
    it('should return an empty map for empty criteria list', async () => {
      const result = await service.countMatchingCredentialsBatch([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should return an empty map when all criteria have undefined resourceID', async () => {
      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member' },
        { type: 'space-member', resourceID: undefined },
      ]);

      expect(result.size).toBe(0);
    });

    it('should batch count credentials in a single grouped query', async () => {
      db.groupBy.mockResolvedValueOnce([
        { resourceID: 'res-1', count: 10 },
        { resourceID: 'res-2', count: 20 },
      ]);

      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-1' },
        { type: 'space-member', resourceID: 'res-2' },
      ]);

      expect(result.get('res-1')).toBe(10);
      expect(result.get('res-2')).toBe(20);
    });

    it('should parse count values from DB as numbers', async () => {
      db.groupBy.mockResolvedValueOnce([
        { resourceID: 'res-1', count: 9999 },
      ]);

      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-1' },
      ]);

      const count = result.get('res-1');
      expect(count).toBe(9999);
      expect(typeof count).toBe('number');
    });

    it('should not include resourceIDs for criteria without resourceID', async () => {
      db.groupBy.mockResolvedValueOnce([
        { resourceID: 'res-1', count: 5 },
      ]);

      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-1' },
        { type: 'space-member' }, // no resourceID
      ]);

      expect(result.get('res-1')).toBe(5);
    });

    it('should return result without missing resourceIDs', async () => {
      db.groupBy.mockResolvedValueOnce([
        { resourceID: 'res-1', count: 3 },
        // res-2 has no results
      ]);

      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-1' },
        { type: 'space-member', resourceID: 'res-2' },
      ]);

      expect(result.get('res-1')).toBe(3);
      expect(result.has('res-2')).toBe(false); // not in map - caller uses ?? 0
    });

    it('should propagate database errors', async () => {
      db.groupBy.mockRejectedValueOnce(new Error('query timeout'));

      await expect(
        service.countMatchingCredentialsBatch([
          { type: 'space-member', resourceID: 'res-1' },
        ])
      ).rejects.toThrow('query timeout');
    });

    it('should filter out empty string resourceIDs', async () => {
      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: '' },
      ]);

      // Empty string is falsy - filtered out - returns empty map
      expect(result.size).toBe(0);
    });
  });
});
