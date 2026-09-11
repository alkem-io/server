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
    NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
    NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED,
    NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_DECLINED,
    NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_ACCEPTED,
    NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_DECLINED,
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
          communityInvitationResponse: { email: true, inApp: true, push: true },
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
      for (const event of [
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
      ]) {
        const orgScoped = await (
          service as any
        ).getPrivilegeRequiredCredentialCriteria(
          event,
          undefined,
          undefined,
          'org-1'
        );
        expect(orgScoped.credentialCriteria.length).toBeGreaterThan(0);
      }

      for (const event of [
        NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED,
        NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_DECLINED,
        NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_ACCEPTED,
        NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_DECLINED,
      ]) {
        const outcome = await (
          service as any
        ).getPrivilegeRequiredCredentialCriteria(event, 'space-1', 'user-1');
        expect(outcome.credentialCriteria.length).toBeGreaterThan(0);
      }
    });

    it('the authorization-policy switch resolves every new event without throwing', async () => {
      vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        authorization: { id: 'auth-space-1' },
      } as any);

      for (const event of [
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
      ]) {
        await expect(
          (service as any).getAuthorizationPolicy(
            event,
            undefined,
            undefined,
            'org-1'
          )
        ).resolves.toEqual({ id: 'auth-org-1' });
      }

      for (const event of [
        NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED,
        NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_DECLINED,
        NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_ACCEPTED,
        NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_DECLINED,
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

    it('populates spaceID and organizationID (= actorID) for the org-joined event', () => {
      // This one IS an organization-feed notification: it goes to the
      // organization's own admins, so losing it on leaving the organization is
      // correct.
      const result = service.createInAppNotification({
        type: NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
        category: 'organization' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: { spaceID: 'space-1', actorID: 'org-1' } as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.organizationID).toBe('org-1');
    });

    it.each([
      NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED,
      NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_DECLINED,
      NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_ACCEPTED,
      NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_DECLINED,
      NotificationEvent.SPACE_ADMIN_VIRTUAL_COMMUNITY_INVITATION_DECLINED,
    ])('populates spaceID and contributorActorId — never organizationID — for %s', type => {
      // Every Space-admin invitation-outcome event uses the Actor FK,
      // whatever the invitee's type. `organizationID` is the organization's
      // OWN feed and is what `deleteAllForReceiverInOrganization` wipes when
      // a user stops being an associate; a Space-admin row keyed on it
      // disappears on an unrelated membership change.
      const result = service.createInAppNotification({
        type,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: { spaceID: 'space-1', actorID: 'actor-1' } as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.contributorActorId).toBe('actor-1');
      expect(result.organizationID).toBeUndefined();
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

  describe('extractCoreEntityIds covers EVERY notification event (static source scan)', () => {
    // FR-021 promises that an unmapped event "MUST be caught by an automated
    // exhaustiveness check rather than fail silently". The assertions above
    // only ever asked about the six events this feature added, so a seventh
    // would sail straight into `extractCoreEntityIds`'s default branch — which
    // only `warn`s, then persists an in-app row with every core FK null, and
    // no cascade ever reaps it.
    //
    // This partitions the WHOLE enum: an event is either handled by the
    // switch, or listed below as one that provably never produces an in-app
    // row. A new event that is neither fails here.
    //
    // Verified at the time of writing: none of the exemptions reaches
    // `createInAppNotification`, so the current default branch is unreachable
    // in production — nothing is broken today, and this keeps it that way.
    const NEVER_IN_APP: Record<string, string> = {
      // Enforced at the platform boundary by
      // NotificationInAppAdapter.NOT_SUPPORTED_IN_APP_EVENTS (034-messaging,
      // FR-003/D-2): in-app is permanently OFF regardless of user settings.
      USER_CONVERSATION_MESSAGE_DIRECT: 'NOT_SUPPORTED_IN_APP_EVENTS',
      USER_CONVERSATION_MESSAGE_GROUP: 'NOT_SUPPORTED_IN_APP_EVENTS',
      // Email-only security signals — dispatched solely through
      // notificationExternalAdapter.sendExternalNotifications; no producer
      // calls sendInAppNotifications for them.
      USER_EMAIL_CHANGE_SECURITY_SIGNAL: 'email-only (external adapter)',
      USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION:
        'email-only (external adapter)',
      USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION:
        'email-only (notification.platform.adapter)',
      USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION:
        'email-only (notification.space.adapter)',
      USER_PASSWORD_CHANGE_SECURITY_SIGNAL: 'email-only (external adapter)',
    };

    it('every NotificationEvent is either handled by the switch or explicitly exempt', () => {
      const source = readFileSync(
        join(
          __dirname,
          '../../../platform/in-app-notification/in.app.notification.service.ts'
        ),
        'utf-8'
      );
      const handled = new Set(
        [...source.matchAll(/case NotificationEvent\.([A-Z0-9_]+)/g)].map(
          m => m[1]
        )
      );
      // Sanity: guards against a refactor that makes this vacuously true.
      expect(handled.size).toBeGreaterThan(30);

      const allEvents = Object.keys(NotificationEvent);
      expect(allEvents.length).toBeGreaterThan(handled.size);

      const unaccounted = allEvents.filter(
        event => !handled.has(event) && !(event in NEVER_IN_APP)
      );
      expect(unaccounted).toEqual([]);
    });

    it('no exemption is stale — every exempt event is genuinely absent from the switch', () => {
      const source = readFileSync(
        join(
          __dirname,
          '../../../platform/in-app-notification/in.app.notification.service.ts'
        ),
        'utf-8'
      );
      const handled = new Set(
        [...source.matchAll(/case NotificationEvent\.([A-Z0-9_]+)/g)].map(
          m => m[1]
        )
      );
      const allEvents = new Set(Object.keys(NotificationEvent));

      // An exemption that names a handled event, or an event that no longer
      // exists, is dead weight that hides the next real gap.
      expect(Object.keys(NEVER_IN_APP).filter(e => handled.has(e))).toEqual([]);
      expect(Object.keys(NEVER_IN_APP).filter(e => !allEvents.has(e))).toEqual(
        []
      );
    });
  });
});
