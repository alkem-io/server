import { RoleSetType } from '@common/enums/role.set.type';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrgCommunityGateService } from '@domain/access/role-set/org.community.gate.service';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationAdministrationAuditService } from '@src/platform-admin/organization-administration-audit/organization.administration.audit.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import {
  contentFullAccessActor,
  orgAdminActor,
  orgChildPolicy,
  realAuthorizationService,
  spaceRoleSetPolicy,
  supportActor,
} from '@test/utils/org.community.policy.fixture';
import { type Mock } from 'vitest';
import { PlatformInvitationResolverMutations } from './platform.invitation.resolver.mutations';
import { PlatformInvitationService } from './platform.invitation.service';

describe('PlatformInvitationResolverMutations', () => {
  let resolver: PlatformInvitationResolverMutations;
  let platformInvitationService: PlatformInvitationService;
  let audit: { record: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformInvitationResolverMutations,
        OrgCommunityGateService,
        { provide: AuthorizationService, useValue: realAuthorizationService() },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<PlatformInvitationResolverMutations>(
      PlatformInvitationResolverMutations
    );
    platformInvitationService = module.get<PlatformInvitationService>(
      PlatformInvitationService
    );
    audit = module.get(OrganizationAdministrationAuditService) as any;
    audit.record.mockResolvedValue(undefined);
    (
      platformInvitationService.deletePlatformInvitation as Mock
    ).mockImplementation(async ({ ID }: { ID: string }) => ({ id: ID }));
  });

  const orgEmailInvitation = () => ({
    id: 'pinv-1',
    email: 'someone@example.org',
    authorization: orgChildPolicy(),
    roleSet: { id: 'rs-org', type: RoleSetType.ORGANIZATION },
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deletePlatformInvitation', () => {
    it('lets the organization admin revoke, loading the role set, and writes no row', async () => {
      (
        platformInvitationService.getPlatformInvitationOrFail as Mock
      ).mockResolvedValue(orgEmailInvitation());

      const result = await resolver.deletePlatformInvitation(orgAdminActor(), {
        ID: 'pinv-1',
      });

      expect(result).toEqual({ id: 'pinv-1' });
      expect(
        platformInvitationService.getPlatformInvitationOrFail
      ).toHaveBeenCalledWith('pinv-1', { relations: { roleSet: true } });
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('lets Support revoke an organization email invitation; the row carries the id, never the address', async () => {
      (
        platformInvitationService.getPlatformInvitationOrFail as Mock
      ).mockResolvedValue(orgEmailInvitation());
      const support = supportActor('support-1');

      await resolver.deletePlatformInvitation(support, { ID: 'pinv-1' });

      expect(audit.record).toHaveBeenCalledTimes(1);
      const row = audit.record.mock.calls[0][0];
      expect(row).toEqual({
        actorContext: support,
        roleSetId: 'rs-org',
        action: 'revoke_email_invitation',
        platformInvitationId: 'pinv-1',
      });
      expect(JSON.stringify({ ...row, actorContext: undefined })).not.toContain(
        '@'
      );
    });

    it('leaves Content Full Access its pre-existing root-cascade DELETE, never audited', async () => {
      (
        platformInvitationService.getPlatformInvitationOrFail as Mock
      ).mockResolvedValue(orgEmailInvitation());

      await resolver.deletePlatformInvitation(contentFullAccessActor(), {
        ID: 'pinv-1',
      });

      expect(
        platformInvitationService.deletePlatformInvitation
      ).toHaveBeenCalledTimes(1);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('refuses Support on a Space email invitation', async () => {
      (
        platformInvitationService.getPlatformInvitationOrFail as Mock
      ).mockResolvedValue({
        ...orgEmailInvitation(),
        authorization: spaceRoleSetPolicy(),
        roleSet: { id: 'rs-space', type: RoleSetType.SPACE },
      });
      await expect(
        resolver.deletePlatformInvitation(supportActor(), { ID: 'pinv-1' })
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(
        platformInvitationService.deletePlatformInvitation
      ).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });
  });
});
