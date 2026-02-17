import { IdentityVerificationStatusFilter } from '@common/enums/identity.verification.status.filter';
import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminIdentityService } from './admin.identity.service';

describe('AdminIdentityService', () => {
  let service: AdminIdentityService;
  let kratosService: {
    getUnverifiedIdentities: Mock;
    getVerifiedIdentities: Mock;
    getAllIdentities: Mock;
    getIdentityByEmail: Mock;
    deleteIdentityByEmail: Mock;
    deleteIdentityById: Mock;
  };
  let userLookupService: {
    getUserByAuthenticationID: Mock;
    getUserByEmail: Mock;
  };
  let userService: { clearAuthenticationIDForUser: Mock };

  const makeIdentity = (
    id: string,
    email: string,
    verified = false,
    firstName = 'First',
    lastName = 'Last'
  ) => ({
    id,
    created_at: '2024-01-01T00:00:00Z',
    traits: {
      email,
      name: { first: firstName, last: lastName },
    },
    verifiable_addresses: [
      {
        value: email,
        status: verified ? 'completed' : 'pending',
        verified,
      },
    ],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminIdentityService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminIdentityService);
    kratosService = module.get(
      KratosService
    ) as unknown as typeof kratosService;
    userLookupService = module.get(
      UserLookupService
    ) as unknown as typeof userLookupService;
    userService = module.get(UserService) as unknown as typeof userService;
  });

  describe('getIdentitiesByVerificationStatus', () => {
    it('should call getVerifiedIdentities when filter is VERIFIED', async () => {
      const identity = makeIdentity('id-1', 'a@b.com', true);
      vi.mocked(kratosService.getVerifiedIdentities).mockResolvedValue([
        identity,
      ]);

      const result = await service.getIdentitiesByVerificationStatus(
        IdentityVerificationStatusFilter.VERIFIED
      );

      expect(kratosService.getVerifiedIdentities).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('a@b.com');
    });

    it('should call getUnverifiedIdentities when filter is UNVERIFIED', async () => {
      const identity = makeIdentity('id-2', 'c@d.com', false);
      vi.mocked(kratosService.getUnverifiedIdentities).mockResolvedValue([
        identity,
      ]);

      const result = await service.getIdentitiesByVerificationStatus(
        IdentityVerificationStatusFilter.UNVERIFIED
      );

      expect(kratosService.getUnverifiedIdentities).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].isVerified).toBe(false);
    });

    it('should call getAllIdentities when filter is ALL', async () => {
      vi.mocked(kratosService.getAllIdentities).mockResolvedValue([]);

      await service.getIdentitiesByVerificationStatus(
        IdentityVerificationStatusFilter.ALL
      );

      expect(kratosService.getAllIdentities).toHaveBeenCalled();
    });

    it('should default to ALL when no filter is provided', async () => {
      vi.mocked(kratosService.getAllIdentities).mockResolvedValue([]);

      await service.getIdentitiesByVerificationStatus();

      expect(kratosService.getAllIdentities).toHaveBeenCalled();
    });
  });

  describe('mapToKratosIdentityDto (via getUnverifiedIdentities)', () => {
    it('should map verifiable_addresses email as primary email', async () => {
      const identity = makeIdentity('id-1', 'traits@email.com', false);
      identity.verifiable_addresses![0].value = 'verified@email.com';
      vi.mocked(kratosService.getUnverifiedIdentities).mockResolvedValue([
        identity,
      ]);

      const result = await service.getUnverifiedIdentities();

      expect(result[0].email).toBe('verified@email.com');
    });

    it('should fall back to traits email when verifiable_addresses is empty', async () => {
      const identity = {
        id: 'id-1',
        created_at: '2024-01-01T00:00:00Z',
        traits: {
          email: 'fallback@email.com',
          name: { first: 'F', last: 'L' },
        },
        verifiable_addresses: [],
      };
      vi.mocked(kratosService.getUnverifiedIdentities).mockResolvedValue([
        identity as any,
      ]);

      const result = await service.getUnverifiedIdentities();

      // verifiable_addresses[0] is undefined, so falls through to traits.email
      expect(result[0].email).toBe('fallback@email.com');
    });

    it('should use "Unknown" when no email is available at all', async () => {
      const identity = {
        id: 'id-1',
        created_at: '2024-01-01T00:00:00Z',
        traits: {},
      };
      vi.mocked(kratosService.getUnverifiedIdentities).mockResolvedValue([
        identity as any,
      ]);

      const result = await service.getUnverifiedIdentities();

      expect(result[0].email).toBe('Unknown');
    });
  });

  describe('deleteIdentityByEmail', () => {
    it('should return false when getIdentityByEmail throws', async () => {
      vi.mocked(kratosService.getIdentityByEmail).mockRejectedValue(
        new Error('network error')
      );

      const result = await service.deleteIdentityByEmail('bad@email.com');

      expect(result).toBe(false);
    });

    it('should return false when no identity is found', async () => {
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue(undefined);

      const result = await service.deleteIdentityByEmail('no-match@email.com');

      expect(result).toBe(false);
      expect(kratosService.deleteIdentityByEmail).not.toHaveBeenCalled();
    });

    it('should return false when deleteIdentityByEmail throws', async () => {
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue({
        id: 'kratos-1',
      } as any);
      vi.mocked(kratosService.deleteIdentityByEmail).mockRejectedValue(
        new Error('delete failed')
      );

      const result = await service.deleteIdentityByEmail('user@email.com');

      expect(result).toBe(false);
    });

    it('should clear authenticationID and return true on successful deletion', async () => {
      const identity = { id: 'kratos-1' } as any;
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue(identity);
      vi.mocked(kratosService.deleteIdentityByEmail).mockResolvedValue(
        undefined
      );
      const user = { id: 'user-1' } as any;
      vi.mocked(userLookupService.getUserByAuthenticationID).mockResolvedValue(
        user
      );
      vi.mocked(userService.clearAuthenticationIDForUser).mockResolvedValue(
        undefined
      );

      const result = await service.deleteIdentityByEmail('user@email.com');

      expect(result).toBe(true);
      expect(userService.clearAuthenticationIDForUser).toHaveBeenCalledWith(
        user
      );
    });

    it('should try email lookup when user not found by authenticationID', async () => {
      const identity = { id: 'kratos-1' } as any;
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue(identity);
      vi.mocked(kratosService.deleteIdentityByEmail).mockResolvedValue(
        undefined
      );
      vi.mocked(userLookupService.getUserByAuthenticationID).mockResolvedValue(
        null as any
      );
      const user = { id: 'user-2' } as any;
      vi.mocked(userLookupService.getUserByEmail).mockResolvedValue(user);
      vi.mocked(userService.clearAuthenticationIDForUser).mockResolvedValue(
        undefined
      );

      const result = await service.deleteIdentityByEmail('user@email.com');

      expect(result).toBe(true);
      expect(userLookupService.getUserByEmail).toHaveBeenCalledWith(
        'user@email.com'
      );
      expect(userService.clearAuthenticationIDForUser).toHaveBeenCalledWith(
        user
      );
    });
  });

  describe('deleteIdentity', () => {
    it('should return false when deleteIdentityById throws', async () => {
      vi.mocked(kratosService.deleteIdentityById).mockRejectedValue(
        new Error('fail')
      );

      const result = await service.deleteIdentity('kratos-id');

      expect(result).toBe(false);
    });

    it('should return true and clear authenticationID on successful deletion', async () => {
      vi.mocked(kratosService.deleteIdentityById).mockResolvedValue(undefined);
      const user = { id: 'user-1' } as any;
      vi.mocked(userLookupService.getUserByAuthenticationID).mockResolvedValue(
        user
      );
      vi.mocked(userService.clearAuthenticationIDForUser).mockResolvedValue(
        undefined
      );

      const result = await service.deleteIdentity('kratos-id');

      expect(result).toBe(true);
      expect(userLookupService.getUserByAuthenticationID).toHaveBeenCalledWith(
        'kratos-id'
      );
    });
  });
});
