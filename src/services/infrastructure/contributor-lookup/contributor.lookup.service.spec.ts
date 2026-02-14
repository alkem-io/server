import { DELETED_ACTOR_ID, MATRIX_BOT_ACTOR_ID } from '@common/constants/system.actor.ids';
import { EntityNotFoundException } from '@common/exceptions';
import { InvalidUUID } from '@common/exceptions/invalid.uuid';
import { Organization } from '@domain/community/organization/organization.entity';
import { User } from '@domain/community/user/user.entity';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { EntityManager } from 'typeorm';
import { ContributorLookupService } from './contributor.lookup.service';

// Valid v4 UUID for tests
const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('ContributorLookupService', () => {
  let service: ContributorLookupService;
  let entityManager: Mocked<EntityManager>;
  let userLookupService: Mocked<UserLookupService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContributorLookupService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ContributorLookupService);
    entityManager = module.get(getEntityManagerToken());
    userLookupService = module.get(UserLookupService);
  });

  describe('getContributorByUUID', () => {
    it('should return User when found', async () => {
      const user = { id: VALID_UUID };
      entityManager.findOne.mockResolvedValueOnce(user as any);

      const result = await service.getContributorByUUID(
        VALID_UUID
      );

      expect(result).toBe(user);
    });

    it('should return Organization when User not found', async () => {
      const org = { id: VALID_UUID };
      entityManager.findOne
        .mockResolvedValueOnce(null) // User
        .mockResolvedValueOnce(org as any); // Organization

      const result = await service.getContributorByUUID(
        VALID_UUID
      );

      expect(result).toBe(org);
    });

    it('should return VirtualContributor when User and Organization not found', async () => {
      const vc = { id: VALID_UUID };
      entityManager.findOne
        .mockResolvedValueOnce(null) // User
        .mockResolvedValueOnce(null) // Organization
        .mockResolvedValueOnce(vc as any); // VirtualContributor

      const result = await service.getContributorByUUID(
        VALID_UUID
      );

      expect(result).toBe(vc);
    });

    it('should return null when no contributor entity is found', async () => {
      entityManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.getContributorByUUID(
        VALID_UUID
      );

      expect(result).toBeNull();
    });

    it('should throw InvalidUUID when ID is not a valid UUID', async () => {
      await expect(
        service.getContributorByUUID('not-a-uuid')
      ).rejects.toThrow(InvalidUUID);
    });
  });

  describe('getContributorByUuidOrFail', () => {
    it('should throw EntityNotFoundException when contributor is not found', async () => {
      entityManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.getContributorByUuidOrFail(
          VALID_UUID
        )
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getContributorByAgentId', () => {
    it('should return null for system actor IDs (DELETED_ACTOR_ID)', async () => {
      const result = await service.getContributorByAgentId(DELETED_ACTOR_ID);

      expect(result).toBeNull();
      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('should return null for system actor IDs (MATRIX_BOT_ACTOR_ID)', async () => {
      const result = await service.getContributorByAgentId(
        MATRIX_BOT_ACTOR_ID
      );

      expect(result).toBeNull();
    });

    it('should throw InvalidUUID for non-UUID agent IDs', async () => {
      await expect(
        service.getContributorByAgentId('invalid-id')
      ).rejects.toThrow(InvalidUUID);
    });

    it('should search User, then Organization, then VirtualContributor by agent ID', async () => {
      const vc = { id: 'vc-1' };
      entityManager.findOne
        .mockResolvedValueOnce(null) // User
        .mockResolvedValueOnce(null) // Organization
        .mockResolvedValueOnce(vc as any); // VirtualContributor

      const result = await service.getContributorByAgentId(
        VALID_UUID
      );

      expect(result).toBe(vc);
      expect(entityManager.findOne).toHaveBeenCalledTimes(3);
    });
  });

  describe('getUserIdByAgentId', () => {
    it('should return undefined for non-UUID agent IDs', async () => {
      const result = await service.getUserIdByAgentId('not-uuid');

      expect(result).toBeUndefined();
      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('should return user ID when user is found', async () => {
      entityManager.findOne.mockResolvedValue({ id: 'user-1' } as any);

      const result = await service.getUserIdByAgentId(
        VALID_UUID
      );

      expect(result).toBe('user-1');
    });

    it('should return undefined when no user is found for the agent', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getUserIdByAgentId(
        VALID_UUID
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getContributorsManagedByUser', () => {
    it('should throw EntityNotFoundException when user agent is not loaded', async () => {
      userLookupService.getUserOrFail.mockResolvedValue({
        id: 'user-1',
        agent: undefined,
      } as any);

      await expect(
        service.getContributorsManagedByUser('user-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should include user, managed organizations, and their virtual contributors', async () => {
      const user = {
        id: 'user-1',
        agent: { id: 'agent-1' },
        accountID: 'account-1',
      };
      const org = {
        id: 'org-1',
        agent: { id: 'agent-2' },
        accountID: 'account-2',
      };
      const vc1 = { id: 'vc-from-user-account' };
      const vc2 = { id: 'vc-from-org-account' };

      userLookupService.getUserOrFail.mockResolvedValue(user as any);
      // getCredentialsByTypeHeldByAgent returns org credentials
      entityManager.find
        .mockResolvedValueOnce([
          { resourceID: 'org-1', type: 'organization-owner' },
        ] as any) // credentials
        .mockResolvedValueOnce([org] as any) // organizations
        .mockResolvedValueOnce([vc1] as any) // VCs for user account
        .mockResolvedValueOnce([vc2] as any); // VCs for org account

      const result = await service.getContributorsManagedByUser('user-1');

      expect(result).toHaveLength(4);
      expect(result).toContain(user);
      expect(result).toContainEqual(org);
      expect(result).toContainEqual(vc1);
      expect(result).toContainEqual(vc2);
    });
  });
});
