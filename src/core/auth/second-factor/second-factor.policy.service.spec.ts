import { AuthorizationCredential } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { SecondFactorRequiredError } from '@core/auth/oidc/strategies/auth.errors';
import { Organization } from '@domain/community/organization/organization.entity';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { In } from 'typeorm';
import { vi } from 'vitest';
import {
  SECOND_FACTOR_GRACE_MS,
  SecondFactorPolicyService,
} from './second-factor.policy.service';

const DAY_MS = 24 * 3600 * 1000;
const S = new Date('2026-11-01T10:00:00.000Z');
const S_ISO = S.toISOString();

const credential = (type: string, resourceID = '') => ({ type, resourceID });

const platformRow = (security?: Record<string, unknown>) => ({
  id: 'platform-1',
  settings: {
    integration: {},
    ...(security ? { security } : {}),
  },
});

const organizationRow = (id: string, security?: Record<string, unknown>) => ({
  id,
  settings: {
    privacy: {},
    membership: {},
    ...(security ? { security } : {}),
  },
});

describe('SecondFactorPolicyService', () => {
  let service: SecondFactorPolicyService;
  let platformRepository: { findOne: ReturnType<typeof vi.fn> };
  let organizationRepository: { find: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    platformRepository = { findOne: vi.fn() };
    organizationRepository = { find: vi.fn() };
    const module = await Test.createTestingModule({
      providers: [
        SecondFactorPolicyService,
        { provide: getRepositoryToken(Platform), useValue: platformRepository },
        {
          provide: getRepositoryToken(Organization),
          useValue: organizationRepository,
        },
      ],
    }).compile();
    service = module.get(SecondFactorPolicyService);
  });

  const stamped = (
    credentials: { type: string; resourceID: string }[],
    satisfied: boolean
  ) =>
    Object.assign(new ActorContext(), {
      actorID: 'actor-1',
      credentials,
      secondFactor: { satisfied },
    });

  describe('coverage', () => {
    it('covers nobody without platform or organization credentials, reading nothing', async () => {
      const result = await service.coverage([
        credential(AuthorizationCredential.GLOBAL_REGISTERED),
        credential(AuthorizationCredential.SPACE_MEMBER, 'space-1'),
      ]);

      expect(result).toEqual({ covered: false, deadline: null });
      expect(platformRepository.findOne).not.toHaveBeenCalled();
      expect(organizationRepository.find).not.toHaveBeenCalled();
    });

    it('covers a platform-role holder with the platform rule on, deadline since + 14 days', async () => {
      platformRepository.findOne.mockResolvedValue(
        platformRow({
          secondFactorRequiredForPlatformRoles: true,
          secondFactorRequiredForPlatformRolesSince: S_ISO,
        })
      );

      const result = await service.coverage([
        credential(AuthorizationCredential.PLATFORM_SUPPORT),
      ]);

      expect(result).toEqual({
        covered: true,
        deadline: new Date(S.getTime() + 14 * DAY_MS),
      });
      expect(SECOND_FACTOR_GRACE_MS).toBe(14 * DAY_MS);
      expect(platformRepository.findOne).toHaveBeenCalledTimes(1);
      expect(platformRepository.findOne).toHaveBeenCalledWith({
        where: {},
        select: ['id', 'settings'],
        loadEagerRelations: false,
      });
    });

    it('does not cover a feature credential alone and reads nothing', async () => {
      const result = await service.coverage([
        credential(AuthorizationCredential.FEATURE_BETA_TESTER),
      ]);

      expect(result).toEqual({ covered: false, deadline: null });
      expect(platformRepository.findOne).not.toHaveBeenCalled();
    });

    it('reads every organization of the actor at once and covers when a rule is on', async () => {
      organizationRepository.find.mockResolvedValue([
        organizationRow('org-1', {
          secondFactorRequired: true,
          secondFactorRequiredSince: S_ISO,
        }),
        organizationRow('org-2', {
          secondFactorRequired: false,
          secondFactorRequiredSince: null,
        }),
      ]);

      const result = await service.coverage([
        credential(AuthorizationCredential.ORGANIZATION_OWNER, 'org-1'),
        credential(AuthorizationCredential.ORGANIZATION_ADMIN, 'org-1'),
        credential(AuthorizationCredential.ORGANIZATION_ASSOCIATE, 'org-2'),
      ]);

      expect(result).toEqual({
        covered: true,
        deadline: new Date(S.getTime() + 14 * DAY_MS),
      });
      expect(organizationRepository.find).toHaveBeenCalledTimes(1);
      expect(organizationRepository.find).toHaveBeenCalledWith({
        where: { id: In(['org-1', 'org-2']) },
        select: ['id', 'settings'],
        loadEagerRelations: false,
      });
    });

    it('does not cover a member of an organization whose rule is off', async () => {
      organizationRepository.find.mockResolvedValue([
        organizationRow('org-2', {
          secondFactorRequired: false,
          secondFactorRequiredSince: S_ISO,
        }),
      ]);

      const result = await service.coverage([
        credential(AuthorizationCredential.ORGANIZATION_ASSOCIATE, 'org-2'),
      ]);

      expect(result).toEqual({ covered: false, deadline: null });
    });

    it('reads rows written before the rule existed as rules that are off, without throwing', async () => {
      platformRepository.findOne.mockResolvedValue(platformRow());
      organizationRepository.find.mockResolvedValue([organizationRow('org-1')]);

      const result = await service.coverage([
        credential(AuthorizationCredential.PLATFORM_SUPPORT),
        credential(AuthorizationCredential.ORGANIZATION_ADMIN, 'org-1'),
      ]);

      expect(result).toEqual({ covered: false, deadline: null });
    });

    it('takes the earliest deadline of two applicable rules', async () => {
      const later = new Date(S.getTime() + 5 * DAY_MS);
      platformRepository.findOne.mockResolvedValue(
        platformRow({
          secondFactorRequiredForPlatformRoles: true,
          secondFactorRequiredForPlatformRolesSince: later.toISOString(),
        })
      );
      organizationRepository.find.mockResolvedValue([
        organizationRow('org-1', {
          secondFactorRequired: true,
          secondFactorRequiredSince: S_ISO,
        }),
      ]);
      const credentials = [
        credential(AuthorizationCredential.PLATFORM_USERS_ADMIN),
        credential(AuthorizationCredential.ORGANIZATION_ADMIN, 'org-1'),
      ];

      const both = await service.coverage(credentials);

      expect(both.deadline).toEqual(new Date(S.getTime() + 14 * DAY_MS));

      // Switching the earlier rule off leaves the other's deadline, never a later one.
      organizationRepository.find.mockResolvedValue([
        organizationRow('org-1', {
          secondFactorRequired: false,
          secondFactorRequiredSince: S_ISO,
        }),
      ]);
      const one = await service.coverage(credentials);

      expect(one.deadline).toEqual(new Date(later.getTime() + 14 * DAY_MS));
    });

    it('reads the rules again on every evaluation (nothing is cached)', async () => {
      platformRepository.findOne
        .mockResolvedValueOnce(platformRow())
        .mockResolvedValueOnce(
          platformRow({
            secondFactorRequiredForPlatformRoles: true,
            secondFactorRequiredForPlatformRolesSince: S_ISO,
          })
        );
      const credentials = [
        credential(AuthorizationCredential.PLATFORM_SUPPORT),
      ];

      const first = await service.coverage(credentials);
      const second = await service.coverage(credentials);

      expect(platformRepository.findOne).toHaveBeenCalledTimes(2);
      expect(first.covered).toBe(false);
      expect(second.covered).toBe(true);
    });
  });

  describe('assertNotRefused', () => {
    const ruleOnSince = (since: Date) =>
      platformRepository.findOne.mockResolvedValue(
        platformRow({
          secondFactorRequiredForPlatformRoles: true,
          secondFactorRequiredForPlatformRolesSince: since.toISOString(),
        })
      );
    const platformRole = [credential(AuthorizationCredential.PLATFORM_SUPPORT)];
    const afterDeadline = new Date(S.getTime() + 14 * DAY_MS);

    it('refuses a covered, unsatisfied actor once the deadline is reached', async () => {
      ruleOnSince(S);

      await expect(
        service.assertNotRefused(stamped(platformRole, false), afterDeadline)
      ).rejects.toBeInstanceOf(SecondFactorRequiredError);
    });

    it('never refuses a satisfied actor', async () => {
      ruleOnSince(S);

      await expect(
        service.assertNotRefused(stamped(platformRole, true), afterDeadline)
      ).resolves.toBeUndefined();
    });

    it('does not refuse before the deadline', async () => {
      ruleOnSince(S);

      await expect(
        service.assertNotRefused(
          stamped(platformRole, false),
          new Date(afterDeadline.getTime() - 1)
        )
      ).resolves.toBeUndefined();
    });

    it('refuses a credential gained after the deadline at once (no grace of its own)', async () => {
      ruleOnSince(S);
      const lateJoiner = stamped([], false);
      await expect(
        service.assertNotRefused(lateJoiner, afterDeadline)
      ).resolves.toBeUndefined();

      lateJoiner.credentials = platformRole;

      await expect(
        service.assertNotRefused(lateJoiner, afterDeadline)
      ).rejects.toBeInstanceOf(SecondFactorRequiredError);
    });

    it('never evaluates an actor without a sign-in stamp', async () => {
      ruleOnSince(S);
      const unstamped = Object.assign(new ActorContext(), {
        actorID: 'actor-1',
        credentials: platformRole,
      });

      await expect(
        service.assertNotRefused(unstamped, afterDeadline)
      ).resolves.toBeUndefined();
      expect(platformRepository.findOne).not.toHaveBeenCalled();
    });

    it('rejects with the read error when a rule read fails (nothing is served)', async () => {
      const failure = new Error('connection terminated');
      platformRepository.findOne.mockRejectedValue(failure);

      await expect(
        service.assertNotRefused(stamped(platformRole, false), afterDeadline)
      ).rejects.toBe(failure);
    });
  });
});
