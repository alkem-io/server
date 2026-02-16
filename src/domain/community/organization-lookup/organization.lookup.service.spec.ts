import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { OrganizationLookupService } from './organization.lookup.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('OrganizationLookupService', () => {
  let service: OrganizationLookupService;
  let db: any;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationLookupService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(OrganizationLookupService);
    db = module.get(DRIZZLE);
  });

  describe('getOrganizationByUUID', () => {
    it('should return the organization when found by ID', async () => {
      const mockOrg = { id: 'org-1', nameID: 'my-org' };
      db.query.organizations.findFirst.mockResolvedValueOnce(mockOrg);

      const result = await service.getOrganizationByUUID('org-1');
      expect(result).toBe(mockOrg);
    });

    it('should return null when no organization matches the ID', async () => {

      const result = await service.getOrganizationByUUID('nonexistent');
      expect(result).toBeNull();
    });

    it('should merge provided options with the ID where clause', async () => {

      await service.getOrganizationByUUID('org-1', {
        relations: { agent: true },
      });

      expect(db.query.organizations.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          with: { agent: true },
        })
      );
    });
  });

  describe('getOrganizationOrFail', () => {
    it('should return the organization when it exists', async () => {
      const mockOrg = { id: 'org-1' };
      db.query.organizations.findFirst.mockResolvedValueOnce(mockOrg);

      const result = await service.getOrganizationOrFail('org-1');
      expect(result).toBe(mockOrg);
    });

    it('should throw EntityNotFoundException when organization is not found', async () => {

      await expect(service.getOrganizationOrFail('org-999')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getOrganizationAndAgent', () => {
    it('should return organization and agent when agent is initialized', async () => {
      const mockAgent = { id: 'agent-1' };
      const mockOrg = { id: 'org-1', agent: mockAgent };
      db.query.organizations.findFirst.mockResolvedValueOnce(mockOrg);

      const result = await service.getOrganizationAndAgent('org-1');
      expect(result.organization).toBe(mockOrg);
      expect(result.agent).toBe(mockAgent);
    });

    it('should throw EntityNotInitializedException when agent is not loaded', async () => {
      const mockOrg = { id: 'org-1', agent: undefined };
      db.query.organizations.findFirst.mockResolvedValueOnce(mockOrg);

      await expect(service.getOrganizationAndAgent('org-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should throw EntityNotFoundException when organization does not exist', async () => {

      await expect(service.getOrganizationAndAgent('org-999')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getOrganizationByNameIdOrFail', () => {
    it('should return the organization when found by nameID', async () => {
      const mockOrg = { id: 'org-1', nameID: 'my-org' };
      db.query.organizations.findFirst.mockResolvedValueOnce(mockOrg);

      const result = await service.getOrganizationByNameIdOrFail('my-org');
      expect(result).toBe(mockOrg);
    });

    it('should throw EntityNotFoundException when nameID does not match', async () => {

      await expect(
        service.getOrganizationByNameIdOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getOrganizationByDomain', () => {
    it('should return the organization when found by domain', async () => {
      const mockOrg = { id: 'org-1', domain: 'example.com' };
      db.query.organizations.findFirst.mockResolvedValueOnce(mockOrg);

      const result = await service.getOrganizationByDomain('example.com');
      expect(result).toBe(mockOrg);
    });

    it('should return null when no organization matches the domain', async () => {

      const result = await service.getOrganizationByDomain('unknown.com');
      expect(result).toBeNull();
    });
  });

  describe('organizationsWithCredentials', () => {
    it('should default resourceID to empty string when not provided', async () => {
      // The selectDistinct chain resolves to the mock; override limit to return empty array
      db.limit.mockResolvedValueOnce([]);

      const result = await service.organizationsWithCredentials({
        type: 'space-admin' as any,
      });

      expect(result).toEqual([]);
      expect(db.selectDistinct).toHaveBeenCalled();
    });

    it('should pass the limit parameter to the query', async () => {
      db.limit.mockResolvedValueOnce([]);

      const result = await service.organizationsWithCredentials(
        { type: 'space-admin' as any, resourceID: 'space-1' },
        10
      );

      expect(result).toEqual([]);
      expect(db.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('countOrganizationsWithCredentials', () => {
    it('should return the count from the query result', async () => {
      // The select chain resolves via where; override to return count result
      db.where.mockResolvedValueOnce([{ count: 3 }]);

      const result = await service.countOrganizationsWithCredentials({
        type: 'space-member' as any,
        resourceID: 'space-1',
      });

      expect(result).toBe(3);
    });

    it('should default resourceID to empty string when not provided', async () => {
      db.where.mockResolvedValueOnce([{ count: 0 }]);

      await service.countOrganizationsWithCredentials({
        type: 'space-admin' as any,
      });

      expect(db.select).toHaveBeenCalled();
    });
  });
});
