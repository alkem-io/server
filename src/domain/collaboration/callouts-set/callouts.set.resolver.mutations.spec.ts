import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LoggerService } from '@nestjs/common';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { TemporaryStorageService } from '@services/infrastructure/temporary-storage/temporary.storage.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import { CalloutsSetResolverMutations } from './callouts.set.resolver.mutations';
import { CalloutsSetService } from './callouts.set.service';

describe('CalloutsSetResolverMutations - poll contribution reporting', () => {
  const authorizationService = {
    grantAccessOrFail: vi.fn(),
  } as unknown as AuthorizationService;

  const authorizationPolicyService = {
    saveAll: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuthorizationPolicyService;

  const calloutsSetService = {
    getCalloutsSetOrFail: vi.fn(),
    createCalloutOnCalloutsSet: vi.fn(),
  } as unknown as CalloutsSetService;

  const calloutAuthorizationService = {
    applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
  } as unknown as CalloutAuthorizationService;

  const calloutService = {
    save: vi.fn().mockResolvedValue(undefined),
    getStorageBucket: vi.fn().mockResolvedValue({ id: 'bucket-1' }),
    getCalloutOrFail: vi.fn(),
  } as unknown as CalloutService;

  const communityResolverService = {
    getLevelZeroSpaceIdForCalloutsSet: vi
      .fn()
      .mockResolvedValue('space-root-1'),
  } as unknown as CommunityResolverService;

  const contributionReporter = {
    calloutCreated: vi.fn(),
    calloutPollCreated: vi.fn(),
  } as unknown as ContributionReporterService;

  const activityAdapter = {
    calloutPublished: vi.fn(),
  } as unknown as ActivityAdapter;

  const notificationAdapterSpace = {
    spaceCollaborationCalloutPublished: vi.fn(),
  } as unknown as NotificationSpaceAdapter;

  const roomResolverService = {
    getRoleSetAndSettingsForCollaborationCalloutsSet: vi
      .fn()
      .mockResolvedValue({
        roleSet: {},
        platformRolesAccess: { roles: [] },
        spaceSettings: {},
      }),
  } as unknown as RoomResolverService;

  const temporaryStorageService = {
    moveTemporaryDocuments: vi.fn().mockResolvedValue(undefined),
  } as unknown as TemporaryStorageService;

  const resolver = new CalloutsSetResolverMutations(
    authorizationService,
    authorizationPolicyService,
    calloutsSetService,
    calloutAuthorizationService,
    calloutService,
    communityResolverService,
    contributionReporter,
    activityAdapter,
    notificationAdapterSpace,
    roomResolverService,
    temporaryStorageService,
    MockWinstonProvider.useValue as LoggerService
  );

  beforeEach(() => {
    vi.clearAllMocks();

    (calloutsSetService.getCalloutsSetOrFail as any).mockResolvedValue({
      id: 'callouts-set-1',
      type: CalloutsSetType.COLLABORATION,
      authorization: {},
    });

    (calloutService.getCalloutOrFail as any).mockImplementation(
      async (id: string) => ({
        id,
      })
    );
  });

  it('reports CALLOUT_POLL_CREATED when created callout framing type is POLL', async () => {
    (calloutsSetService.createCalloutOnCalloutsSet as any).mockResolvedValue({
      id: 'callout-1',
      nameID: 'poll-callout',
      settings: { visibility: CalloutVisibility.PUBLISHED },
      framing: {
        type: CalloutFramingType.POLL,
        poll: { id: 'poll-1', title: 'Team vote' },
      },
    });

    await resolver.createCalloutOnCalloutsSet(
      { actorID: 'user-1' } as ActorContext,
      {
        calloutsSetID: 'callouts-set-1',
        framing: {
          profile: { displayName: 'Poll framing' },
          type: CalloutFramingType.POLL,
          poll: { title: 'Team vote', options: ['A', 'B'] },
        },
        settings: { visibility: CalloutVisibility.PUBLISHED },
      } as any
    );

    expect(contributionReporter.calloutCreated).toHaveBeenCalledTimes(1);
    expect(contributionReporter.calloutPollCreated).toHaveBeenCalledWith(
      {
        id: 'callout-1',
        name: 'Team vote',
        space: 'space-root-1',
      },
      expect.any(Object)
    );
  });

  it('does not report CALLOUT_POLL_CREATED for non-poll callouts', async () => {
    (calloutsSetService.createCalloutOnCalloutsSet as any).mockResolvedValue({
      id: 'callout-2',
      nameID: 'standard-callout',
      settings: { visibility: CalloutVisibility.PUBLISHED },
      framing: {
        type: CalloutFramingType.MEMO,
      },
    });

    await resolver.createCalloutOnCalloutsSet(
      { actorID: 'user-1' } as ActorContext,
      {
        calloutsSetID: 'callouts-set-1',
        framing: {
          profile: { displayName: 'Memo framing' },
          type: CalloutFramingType.MEMO,
          memo: { profile: { displayName: 'Memo' } },
        },
        settings: { visibility: CalloutVisibility.PUBLISHED },
      } as any
    );

    expect(contributionReporter.calloutCreated).toHaveBeenCalledTimes(1);
    expect(contributionReporter.calloutPollCreated).not.toHaveBeenCalled();
  });
});
