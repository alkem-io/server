import { AuthorizationService } from '@core/authorization/authorization.service';
import { createMock } from '@golevelup/ts-vitest';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationRecipientsResolverQueries } from './notification.recipients.resolver.queries';
import { NotificationRecipientsService } from './notification.recipients.service';

const actorContext = { actorID: 'user-1' } as any;

describe('NotificationRecipientsResolverQueries', () => {
  let resolver: NotificationRecipientsResolverQueries;
  let recipientsService: ReturnType<
    typeof createMock<NotificationRecipientsService>
  >;
  let authService: ReturnType<typeof createMock<AuthorizationService>>;

  beforeEach(() => {
    authService = createMock<AuthorizationService>();
    recipientsService = createMock<NotificationRecipientsService>();
    const platformAuthService =
      createMock<PlatformAuthorizationPolicyService>();

    platformAuthService.getPlatformAuthorizationPolicy.mockResolvedValue(
      {} as any
    );
    recipientsService.getRecipients.mockResolvedValue({
      recipients: [],
    } as any);

    resolver = new NotificationRecipientsResolverQueries(
      authService,
      recipientsService,
      platformAuthService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should resolve notification recipients with authorization', async () => {
    const eventData = {
      roleSetID: 'rs-1',
      event: 'test-event',
    } as any;

    const result = await resolver.notificationRecipients(
      actorContext,
      eventData
    );

    expect(result).toBeDefined();
    expect(authService.grantAccessOrFail).toHaveBeenCalled();
    expect(recipientsService.getRecipients).toHaveBeenCalledWith(eventData);
  });
});
