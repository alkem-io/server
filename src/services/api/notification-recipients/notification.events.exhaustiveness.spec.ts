import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { NotificationEvent } from '@common/enums/notification.event';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationInAppAdapter } from '@services/adapters/notification-in-app-adapter/notification.in.app.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { InAppNotification } from '../../../platform/in-app-notification/in.app.notification.entity';
import { InAppNotificationService } from '../../../platform/in-app-notification/in.app.notification.service';
import { NotificationRecipientsService } from './notification.recipients.service';

/**
 * Guards against the class of regression this feature is most exposed to:
 * a new notification event that reaches one of the exhaustive mapping
 * points (recipients criteria, channel settings, authorization policy, FK
 * extraction, in-app support, resolveType) without a case, silently
 * dropping the notification instead of failing loudly.
 */
describe('organization-invitation notification events — exhaustiveness (D14)', () => {
  const NEW_EVENTS = [
    NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
    NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED,
    NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_DECLINED,
  ];

  describe('recipients service mapping points', () => {
    let service: NotificationRecipientsService;
    let organizationLookupService: OrganizationLookupService;
    let userLookupService: UserLookupService;
    let spaceLookupService: SpaceLookupService;

    const fullNotificationSettings = {
      organization: {
        adminMessageReceived: { email: true, inApp: true, push: true },
        adminMentioned: { email: true, inApp: true, push: true },
        adminSpaceCommunityInvitation: {
          email: true,
          inApp: true,
          push: true,
        },
      },
      space: {
        admin: {
          communityNewMember: { email: true, inApp: true, push: true },
        },
      },
    } as any;

    beforeEach(async () => {
      vi.restoreAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [NotificationRecipientsService],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      service = module.get(NotificationRecipientsService);
      organizationLookupService = module.get(OrganizationLookupService);
      userLookupService = module.get(UserLookupService);
      spaceLookupService = module.get(SpaceLookupService);

      vi.mocked(
        organizationLookupService.getOrganizationByIdOrFail
      ).mockResolvedValue({
        id: 'org-1',
        authorization: { id: 'auth-org-1' },
      } as any);
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        id: 'user-1',
        authorization: { id: 'auth-user-1' },
      } as any);
    });

    it('getChannelsSettingsForEvent resolves every new event without throwing', () => {
      for (const event of NEW_EVENTS) {
        expect(() =>
          (service as any).getChannelsSettingsForEvent(
            event,
            fullNotificationSettings
          )
        ).not.toThrow();
      }
    });

    it('getPrivilegeRequiredCredentialCriteria resolves every new event without throwing', async () => {
      const orgInvited = await (
        service as any
      ).getPrivilegeRequiredCredentialCriteria(
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        undefined,
        undefined,
        'org-1'
      );
      expect(orgInvited.credentialCriteria.length).toBeGreaterThan(0);

      for (const event of [
        NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED,
        NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_DECLINED,
      ]) {
        const outcome = await (
          service as any
        ).getPrivilegeRequiredCredentialCriteria(event, undefined, 'user-1');
        expect(outcome.credentialCriteria.length).toBeGreaterThan(0);
      }
    });

    it('the authorization-policy switch resolves every new event without throwing', async () => {
      vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        authorization: { id: 'auth-space-1' },
      } as any);

      await expect(
        (service as any).getAuthorizationPolicy(
          NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
          undefined,
          undefined,
          'org-1'
        )
      ).resolves.toEqual({ id: 'auth-org-1' });

      for (const event of [
        NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED,
        NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_DECLINED,
      ]) {
        await expect(
          (service as any).getAuthorizationPolicy(event, 'space-1')
        ).resolves.toEqual({ id: 'auth-space-1' });
      }
    });
  });

  it('none of the three events is in NOT_SUPPORTED_IN_APP_EVENTS', () => {
    const unsupported = (NotificationInAppAdapter as any)
      .NOT_SUPPORTED_IN_APP_EVENTS as NotificationEvent[];
    for (const event of NEW_EVENTS) {
      expect(unsupported).not.toContain(event);
    }
  });

  describe('FK extraction', () => {
    let service: InAppNotificationService;
    let notificationRepo: { create: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
      vi.restoreAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InAppNotificationService,
          repositoryProviderMockFactory(InAppNotification),
          MockWinstonProvider,
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      service = module.get(InAppNotificationService);
      notificationRepo = module.get(getRepositoryToken(InAppNotification));
      notificationRepo.create.mockImplementation((input: any) => input);
    });

    it('populates spaceID, invitationID and organizationID for the org-invited event', () => {
      const result = service.createInAppNotification({
        type: NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        category: 'organization' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: {
          spaceID: 'space-1',
          invitationID: 'inv-1',
          organizationID: 'org-1',
        } as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.invitationID).toBe('inv-1');
      expect(result.organizationID).toBe('org-1');
    });

    it.each([
      NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED,
      NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_DECLINED,
    ])('populates spaceID and organizationID (= actorID) for %s', type => {
      const result = service.createInAppNotification({
        type,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: { spaceID: 'space-1', actorID: 'org-1' } as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.organizationID).toBe('org-1');
    });
  });

  describe('resolveType coverage (static source scan)', () => {
    const payloadDtoDir = join(
      __dirname,
      '../../../platform/in-app-notification-payload/dto'
    );
    const resolveTypeFile = join(
      __dirname,
      '../../../platform/in-app-notification-payload/in.app.notification.payload.interface.ts'
    );

    function listTsFiles(dir: string): string[] {
      const entries = readdirSync(dir);
      const files: string[] = [];
      for (const entry of entries) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          files.push(...listTsFiles(full));
        } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
          files.push(full);
        }
      }
      return files;
    }

    it('every NotificationEventPayload value declared as `type` by a DTO is resolved by resolveType', () => {
      const declaredTypes = new Set<string>();
      const declareTypePattern =
        /declare type:\s*NotificationEventPayload\.([A-Z0-9_]+)/g;
      for (const file of listTsFiles(payloadDtoDir)) {
        const content = readFileSync(file, 'utf-8');
        let match: RegExpExecArray | null;
        while ((match = declareTypePattern.exec(content))) {
          declaredTypes.add(match[1]);
        }
      }
      // Sanity: the scan actually found DTOs (guards against a refactor that
      // silently makes this assertion vacuously true).
      expect(declaredTypes.size).toBeGreaterThan(10);

      const resolveTypeSource = readFileSync(resolveTypeFile, 'utf-8');
      const resolvedTypes = new Set<string>();
      const casePattern = /case NotificationEventPayload\.([A-Z0-9_]+):/g;
      let caseMatch: RegExpExecArray | null;
      while ((caseMatch = casePattern.exec(resolveTypeSource))) {
        resolvedTypes.add(caseMatch[1]);
      }

      const missing = [...declaredTypes].filter(t => !resolvedTypes.has(t));
      expect(missing).toEqual([]);
    });
  });

  describe('dispatcher exhaustiveness never-guard (static source scan)', () => {
    it('the invitation-result notification dispatcher has a compile-time never guard in its default case', () => {
      const source = readFileSync(
        join(
          __dirname,
          '../../../domain/access/role-set/role.set.resolver.mutations.membership.ts'
        ),
        'utf-8'
      );
      expect(source).toMatch(/default:\s*\{[^}]*:\s*never\s*=/s);
    });
  });
});
