import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { VirtualContributorLookupService } from './virtual.contributor.lookup.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('VirtualContributorLookupService', () => {
  let service: VirtualContributorLookupService;
  let db: any;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorLookupService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VirtualContributorLookupService);
    db = module.get(DRIZZLE);
  });

  describe('getVirtualContributorOrFail', () => {
    it('should throw EntityNotFoundException when the ID is not a valid UUID', async () => {
      await expect(
        service.getVirtualContributorOrFail('not-a-uuid')
      ).rejects.toThrow(EntityNotFoundException);

    });

    it('should return the virtual contributor when found by valid UUID', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockVC = { id: validId, nameID: 'test-vc' };
      db.query.virtualContributors.findFirst.mockResolvedValueOnce(mockVC);

      const result = await service.getVirtualContributorOrFail(validId);
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when no virtual contributor is found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      await expect(
        service.getVirtualContributorOrFail(validId)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorAndAgent', () => {
    it('should return virtual contributor and agent when agent is initialized', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockAgent = { id: 'agent-1' };
      const mockVC = { id: validId, agent: mockAgent };
      db.query.virtualContributors.findFirst.mockResolvedValueOnce(mockVC);

      const result = await service.getVirtualContributorAndAgent(validId);
      expect(result.virtualContributor).toBe(mockVC);
      expect(result.agent).toBe(mockAgent);
    });

    it('should throw EntityNotInitializedException when agent is not loaded', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockVC = { id: validId, agent: undefined };
      db.query.virtualContributors.findFirst.mockResolvedValueOnce(mockVC);

      await expect(
        service.getVirtualContributorAndAgent(validId)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getVirtualContributorByAgentId', () => {
    it('should return the virtual contributor when found by agent ID', async () => {
      const mockVC = { id: 'vc-1', agent: { id: 'agent-1' } };
      db.query.virtualContributors.findFirst.mockResolvedValueOnce(mockVC);

      const result = await service.getVirtualContributorByAgentId('agent-1');
      expect(result).toBe(mockVC);
    });

    it('should return null when no virtual contributor matches the agent ID', async () => {

      const result = await service.getVirtualContributorByAgentId('agent-999');
      expect(result).toBeNull();
    });
  });

  describe('getVirtualContributorByAgentIdOrFail', () => {
    it('should return the virtual contributor when found', async () => {
      const mockVC = { id: 'vc-1', agent: { id: 'agent-1' } };
      db.query.virtualContributors.findFirst.mockResolvedValueOnce(mockVC);

      const result =
        await service.getVirtualContributorByAgentIdOrFail('agent-1');
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when no virtual contributor matches', async () => {

      await expect(
        service.getVirtualContributorByAgentIdOrFail('agent-999')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorByNameIdOrFail', () => {
    it('should return the virtual contributor when found by nameID', async () => {
      const mockVC = { id: 'vc-1', nameID: 'test-vc' };
      db.query.virtualContributors.findFirst.mockResolvedValueOnce(mockVC);

      const result =
        await service.getVirtualContributorByNameIdOrFail('test-vc');
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when nameID does not match', async () => {

      await expect(
        service.getVirtualContributorByNameIdOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('virtualContributorsWithCredentials', () => {
    it('should default resourceID to empty string when not provided', async () => {
      // The selectDistinct chain resolves via limit
      db.limit.mockResolvedValueOnce([]);

      await service.virtualContributorsWithCredentials({
        type: 'space-admin' as any,
      });

      expect(db.selectDistinct).toHaveBeenCalled();
    });

    it('should pass the limit to the query', async () => {
      db.limit.mockResolvedValueOnce([]);

      await service.virtualContributorsWithCredentials(
        { type: 'vc-member' as any, resourceID: 'res-1' },
        5
      );

      expect(db.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('getAccountOrFail', () => {
    it('should return the account when it is loaded on the virtual contributor', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockAccount = { id: 'account-1' };
      const mockVC = { id: validId, account: mockAccount };
      db.query.virtualContributors.findFirst.mockResolvedValueOnce(mockVC);

      const result = await service.getAccountOrFail(validId);
      expect(result).toBe(mockAccount);
    });

    it('should throw EntityNotInitializedException when account is not loaded', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockVC = { id: validId, account: undefined };
      db.query.virtualContributors.findFirst.mockResolvedValueOnce(mockVC);

      await expect(service.getAccountOrFail(validId)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });
});
