import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CredentialType } from '@common/enums/credential.type';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { RoleSetType } from '@common/enums/role.set.type';
import { organizationRoleDefinitions } from '@domain/community/organization/definitions/organization.role.definitions';
import { Organization } from '@domain/community/organization/organization.entity';
import { Space } from '@domain/space/space/space.entity';
import { spaceCommunityRoles } from '@domain/space/space.defaults/definitions/space.community.roles';
import { subspaceCommunityRoles } from '@domain/space/space.defaults/definitions/subspace.community.roles';
import { LoggerService } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleSet } from './role.set.entity';
import { RoleSetCacheService } from './role.set.service.cache';
import { RoleSetCacheInvalidationService } from './role.set.service.cache.invalidation';

/**
 * `findOne` dispatch keyed on the entity class, so a test only declares the
 * rows it cares about and everything else reads as "not found".
 */
function createEntityManager(rows: {
  space?: unknown;
  organization?: unknown;
  platformRoleSet?: unknown;
}) {
  const findOne = vi.fn(async (entity: unknown) => {
    if (entity === Space) return rows.space ?? null;
    if (entity === Organization) return rows.organization ?? null;
    if (entity === RoleSet) return rows.platformRoleSet ?? null;
    return null;
  });
  return { findOne } as unknown as EntityManager & { findOne: typeof findOne };
}

function createService(
  entityManager: EntityManager,
  cache: { cleanActorMembershipCache: ReturnType<typeof vi.fn> },
  logger: { warn: ReturnType<typeof vi.fn> }
) {
  return new RoleSetCacheInvalidationService(
    entityManager,
    cache as unknown as RoleSetCacheService,
    logger as unknown as LoggerService
  );
}

describe('RoleSetCacheInvalidationService', () => {
  let cache: { cleanActorMembershipCache: ReturnType<typeof vi.fn> };
  let logger: { warn: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cache = { cleanActorMembershipCache: vi.fn().mockResolvedValue(undefined) };
    logger = { warn: vi.fn() };
  });

  describe('space role credentials', () => {
    it('cleans the cache on the Space own role set', async () => {
      const entityManager = createEntityManager({
        space: { id: 'space-1', community: { roleSet: { id: 'rs-space' } } },
      });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        AuthorizationCredential.SPACE_MEMBER,
        'space-1'
      );

      expect(cache.cleanActorMembershipCache).toHaveBeenCalledWith(
        'actor-1',
        'rs-space'
      );
    });

    it.each([
      AuthorizationCredential.SPACE_ADMIN,
      AuthorizationCredential.SPACE_LEAD,
      AuthorizationCredential.SPACE_SUBSPACE_ADMIN,
      AuthorizationCredential.SPACE_MEMBER_INVITEE,
    ])('covers %s as well', async credentialType => {
      const entityManager = createEntityManager({
        space: { id: 'space-1', community: { roleSet: { id: 'rs-space' } } },
      });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        credentialType,
        'space-1'
      );

      expect(cache.cleanActorMembershipCache).toHaveBeenCalledWith(
        'actor-1',
        'rs-space'
      );
    });

    it('does nothing when the resourceID is missing', async () => {
      const entityManager = createEntityManager({});
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        AuthorizationCredential.SPACE_MEMBER
      );

      expect(entityManager.findOne).not.toHaveBeenCalled();
      expect(cache.cleanActorMembershipCache).not.toHaveBeenCalled();
    });

    it('does nothing when the Space no longer exists', async () => {
      const entityManager = createEntityManager({});
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        AuthorizationCredential.SPACE_MEMBER,
        'space-gone'
      );

      expect(cache.cleanActorMembershipCache).not.toHaveBeenCalled();
    });
  });

  describe('organization role credentials', () => {
    it.each([
      AuthorizationCredential.ORGANIZATION_ASSOCIATE,
      AuthorizationCredential.ORGANIZATION_ADMIN,
      AuthorizationCredential.ORGANIZATION_OWNER,
    ])('cleans the cache on the Organization role set for %s', async credentialType => {
      const entityManager = createEntityManager({
        organization: { id: 'org-1', roleSet: { id: 'rs-org' } },
      });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        credentialType,
        'org-1'
      );

      expect(cache.cleanActorMembershipCache).toHaveBeenCalledWith(
        'actor-1',
        'rs-org'
      );
    });

    it('does nothing when the resourceID is missing', async () => {
      const entityManager = createEntityManager({
        organization: { id: 'org-1', roleSet: { id: 'rs-org' } },
      });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        AuthorizationCredential.ORGANIZATION_ADMIN
      );

      expect(cache.cleanActorMembershipCache).not.toHaveBeenCalled();
    });
  });

  describe('platform role credentials', () => {
    const platformRoleSet = {
      id: 'rs-platform',
      type: RoleSetType.PLATFORM,
      roles: [
        {
          credential: {
            type: AuthorizationCredential.GLOBAL_ADMIN,
            resourceID: '',
          },
        },
        {
          credential: {
            type: AuthorizationCredential.BETA_TESTER,
            resourceID: '',
          },
        },
      ],
    };

    it('cleans the cache on the platform role set, without a resourceID', async () => {
      const entityManager = createEntityManager({ platformRoleSet });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        AuthorizationCredential.GLOBAL_ADMIN
      );

      expect(cache.cleanActorMembershipCache).toHaveBeenCalledWith(
        'actor-1',
        'rs-platform'
      );
    });

    it('covers a non-global platform role credential', async () => {
      const entityManager = createEntityManager({ platformRoleSet });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        AuthorizationCredential.BETA_TESTER
      );

      expect(cache.cleanActorMembershipCache).toHaveBeenCalledWith(
        'actor-1',
        'rs-platform'
      );
    });

    it('leaves a credential that backs no role alone', async () => {
      const entityManager = createEntityManager({ platformRoleSet });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        AuthorizationCredential.USER_SELF_MANAGEMENT
      );

      expect(cache.cleanActorMembershipCache).not.toHaveBeenCalled();
    });

    it('skips the platform lookup for a resource-scoped credential', async () => {
      const entityManager = createEntityManager({ platformRoleSet });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        'account-1'
      );

      expect(entityManager.findOne).not.toHaveBeenCalled();
      expect(cache.cleanActorMembershipCache).not.toHaveBeenCalled();
    });

    it('does nothing when there is no platform role set', async () => {
      const entityManager = createEntityManager({});
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        AuthorizationCredential.GLOBAL_ADMIN
      );

      expect(cache.cleanActorMembershipCache).not.toHaveBeenCalled();
    });
  });

  /**
   * The credential lists are derived from the shipped role definitions, so a
   * role added to either level is covered without editing this service. These
   * cases fail if that derivation is ever replaced by a restated list that
   * falls behind the definitions.
   */
  describe('coverage of the declared role definitions', () => {
    it.each([
      ...spaceCommunityRoles,
      ...subspaceCommunityRoles,
    ])('covers the space role $name', async roleDefinition => {
      const entityManager = createEntityManager({
        space: { id: 'space-1', community: { roleSet: { id: 'rs-space' } } },
      });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        roleDefinition.credentialData.type as CredentialType,
        'space-1'
      );

      expect(cache.cleanActorMembershipCache).toHaveBeenCalledWith(
        'actor-1',
        'rs-space'
      );
    });

    it.each(
      organizationRoleDefinitions
    )('covers the organization role $name', async roleDefinition => {
      const entityManager = createEntityManager({
        organization: { id: 'org-1', roleSet: { id: 'rs-org' } },
      });
      const service = createService(entityManager, cache, logger);

      await service.invalidateForCredentialChange(
        'actor-1',
        roleDefinition.credentialData.type as CredentialType,
        'org-1'
      );

      expect(cache.cleanActorMembershipCache).toHaveBeenCalledWith(
        'actor-1',
        'rs-org'
      );
    });
  });

  describe('best-effort behaviour', () => {
    it('logs and resolves when the role-set lookup fails', async () => {
      const entityManager = createEntityManager({});
      (entityManager.findOne as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('lookup down')
      );
      const service = createService(entityManager, cache, logger);

      await expect(
        service.invalidateForCredentialChange(
          'actor-1',
          AuthorizationCredential.SPACE_MEMBER,
          'space-1'
        )
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('logs and resolves when the cache clean fails', async () => {
      const entityManager = createEntityManager({
        space: { id: 'space-1', community: { roleSet: { id: 'rs-space' } } },
      });
      cache.cleanActorMembershipCache.mockRejectedValue(
        new Error('redis down')
      );
      const service = createService(entityManager, cache, logger);

      await expect(
        service.invalidateForCredentialChange(
          'actor-1',
          AuthorizationCredential.SPACE_MEMBER,
          'space-1'
        )
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
