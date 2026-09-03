import {
  BaseEventPayload,
  ContributorPayload,
  ConversationDigestEntry,
  NotificationEventPayloadOrganizationMessageDirect,
  NotificationEventPayloadOrganizationMessageRoom,
  NotificationEventPayloadPlatformForumDiscussion,
  NotificationEventPayloadPlatformGlobalRole,
  NotificationEventPayloadPlatformSpaceCreated,
  NotificationEventPayloadPlatformUserRegistration,
  NotificationEventPayloadPlatformUserRemoved,
  NotificationEventPayloadSpace,
  NotificationEventPayloadSpaceCalendarEvent,
  NotificationEventPayloadSpaceCollaborationCallout,
  NotificationEventPayloadSpaceCollaborationCalloutReaction,
  NotificationEventPayloadSpaceCommunicationMessageDirect,
  NotificationEventPayloadSpaceCommunicationUpdate,
  NotificationEventPayloadSpaceCommunityApplication,
  NotificationEventPayloadSpaceCommunityContributor,
  NotificationEventPayloadSpaceCommunityInvitation,
  NotificationEventPayloadSpaceCommunityInvitationPlatform,
  NotificationEventPayloadSpaceCommunityInvitationVirtualContributor,
  NotificationEventPayloadSpacePollModifiedOnPollIVotedOn,
  NotificationEventPayloadSpacePollVoteAffectedByOptionChange,
  NotificationEventPayloadSpacePollVoteCastOnOwnPoll,
  NotificationEventPayloadSpacePollVoteCastOnPollIVotedOn,
  NotificationEventPayloadUserConversationMessageDirect,
  NotificationEventPayloadUserConversationMessageGroup,
  NotificationEventPayloadUserMessageDirect,
  NotificationEventPayloadUserMessageRoom,
  NotificationEventPayloadUserMessageRoomReply,
  RoleChangeType,
} from '@alkemio/notifications-lib';
import { UserPayload } from '@alkemio/notifications-lib/dist/dto/user.payload';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { NotificationEvent } from '@common/enums/notification.event';
import { RoleName } from '@common/enums/role.name';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { sanitizeNotificationCopyText } from '@common/utils/notification.copy.util';
import { IActor } from '@domain/actor/actor/actor.interface';
import { getActorType } from '@domain/actor/actor/actor.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { MessageDetails } from '@domain/communication/message.details/message.details.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { IUser } from '@domain/community/user/user.interface';
import {
  UserEmailChangeGlobalAdminNotificationPayload,
  UserEmailChangeSpaceAdminNotificationPayload,
} from '@domain/community/user-email-change/dto/notification.payloads';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ISpace } from '@domain/space/space/space.interface';
import {
  CalendarEventCalendarData,
  calculateCalendarEventEndDate,
  formatLocation,
  generateCalendarUrls,
  toIsoString,
  validateCalendarDateRange,
} from '@domain/timeline/event/calendar.event.calendar-links';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { ClientProxy } from '@nestjs/microservices';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { AlkemioConfig } from '@src/types';
import { defaultIfEmpty, lastValueFrom } from 'rxjs';
import { NotificationInputUserEmailChangeGlobalAdmin } from '../notification-adapter/dto/platform/notification.dto.input.platform.user.email.change';
import { NotificationInputCollaborationCalloutComment } from '../notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.comment';
import { NotificationInputCollaborationCalloutContributionCreated } from '../notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.contribution.created';
import { NotificationInputCollaborationCalloutPostContributionComment } from '../notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.post.contribution.comment';
import { NotificationInputCommentReply } from '../notification-adapter/dto/space/notification.dto.input.space.communication.user.comment.reply';
import { NotificationInputUserEmailChangeSpaceAdmin } from '../notification-adapter/dto/space/notification.dto.input.space.user.email.change';

interface CalloutContributionPayload {
  id: string;
  displayName: string;
  description: string;
  createdBy: ContributorPayload;
  type: CalloutContributionType;
  url: string;
}

/**
 * Temporary bridge until `@alkemio/notifications-lib` publishes this
 * interface (merge gate — see the contract's rollout ordering). Mirrors
 * the lib shape exactly so the swap to the published import is a pure
 * type-only change.
 */
interface NotificationEventPayloadSpaceCommunityInvitationOrganization
  extends NotificationEventPayloadSpaceCommunityInvitation {
  organizationInvitationsUrl: string;
  extraRoles: string[];
  spacesToJoin: { displayName: string; url: string }[];
  recipientEmail?: string;
}

@Injectable()
export class NotificationExternalAdapter {
  constructor(
    private actorLookupService: ActorLookupService,
    private userLookupService: UserLookupService,
    private configService: ConfigService<AlkemioConfig, true>,
    private urlGeneratorService: UrlGeneratorService,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  public async sendExternalNotifications(
    event: NotificationEvent,
    payload: any
  ): Promise<void> {
    this.notificationsClient.emit<number>(event, payload);
  }

  /**
   * Awaited publish: resolves only once the broker has accepted the event, and
   * REJECTS if it has not.
   *
   * `sendExternalNotifications` above neither awaits nor subscribes to the
   * observable `emit` returns, so a broker outage is invisible to its caller.
   * That is tolerable for callers that emit and move on, but not for the
   * 034 digest flush: it drains the recipient's pending-conversation set and
   * the FR-011b cap anchor from Redis BEFORE dispatching, and reArms only when
   * dispatch throws. With a dispatch that cannot throw, a broker blip during a
   * sweep tick silently destroyed every email digest due in that window and
   * the whole §5.4 retry design was dead code on the email channel.
   *
   * Subscribing is safe here even though `ClientProxy.emit` returns an
   * already-`connect()`ed connectable: its source is a `defer(async ...)`, so
   * nothing can be pushed before this synchronous subscription attaches.
   * `defaultIfEmpty` guards the case where the transport completes without
   * emitting, which would otherwise reject with rxjs's EmptyError and be
   * misread as a publish failure.
   */
  public async sendExternalNotificationsAwaited(
    event: NotificationEvent,
    payload: any
  ): Promise<void> {
    await lastValueFrom(
      this.notificationsClient
        .emit<number>(event, payload)
        .pipe(defaultIfEmpty(undefined as unknown as number))
    );
  }

  /**
   * Email-change publish helpers (research.md §R8). Each helper emits the same
   * underlying RabbitMQ event via `sendExternalNotifications` — the wrappers
   * exist so the orchestration service can call a typed API per event, and so
   * each event has its own retry / audit envelope on the call site.
   */
  public async publishEmailChangeSecuritySignal(
    payload: unknown
  ): Promise<void> {
    await this.sendExternalNotifications(
      NotificationEvent.USER_EMAIL_CHANGE_SECURITY_SIGNAL,
      payload
    );
  }

  public async publishEmailChangeNewAddressNotification(
    payload: unknown
  ): Promise<void> {
    await this.sendExternalNotifications(
      NotificationEvent.USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION,
      payload
    );
  }

  /**
   * Password-change observer publish helper. Sent to the user's current email
   * address whenever a Kratos-side password change is observed — the platform
   * never sees the credential, only the fact of the change.
   */
  public async publishPasswordChangeSecuritySignal(
    payload: unknown
  ): Promise<void> {
    await this.sendExternalNotifications(
      NotificationEvent.USER_PASSWORD_CHANGE_SECURITY_SIGNAL,
      payload
    );
  }

  async buildSpaceCommunityApplicationCreatedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace
  ): Promise<NotificationEventPayloadSpaceCommunityApplication> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const applicantPayload =
      await this.getContributorPayloadOrFail(triggeredBy);
    const payload: NotificationEventPayloadSpaceCommunityApplication = {
      applicant: applicantPayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildNotificationPayloadUserSpaceCommunityInvitation(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    invitedUserID: string,
    space: ISpace,
    welcomeMessage?: string
  ): Promise<NotificationEventPayloadSpaceCommunityInvitation> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const inviteePayload =
      await this.getContributorPayloadOrFail(invitedUserID);
    const payload: NotificationEventPayloadSpaceCommunityInvitation = {
      invitee: inviteePayload,
      welcomeMessage,
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCommunityInvitationVirtualContributorCreatedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    virtualContributorID: string,
    accountHost: IActor,
    space: ISpace,
    welcomeMessage?: string
  ): Promise<NotificationEventPayloadSpaceCommunityInvitationVirtualContributor> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );

    const hostPayload = await this.getContributorPayloadOrFail(accountHost.id);

    const virtualContributorPayload: ContributorPayload =
      await this.getContributorPayloadOrFail(virtualContributorID);
    const result: NotificationEventPayloadSpaceCommunityInvitationVirtualContributor =
      {
        host: hostPayload,
        invitee: virtualContributorPayload,
        welcomeMessage,
        ...spacePayload,
      };
    return result;
  }

  async buildVirtualContributorSpaceCommunityInvitationDeclinedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    virtualContributorID: string,
    space: ISpace
  ): Promise<NotificationEventPayloadSpaceCommunityInvitationVirtualContributor> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );

    const virtualContributorPayload: ContributorPayload =
      await this.getContributorPayloadOrFail(virtualContributorID);

    // For declined invitations, we don't need the host payload, so we can reuse the virtual contributor as both
    const result: NotificationEventPayloadSpaceCommunityInvitationVirtualContributor =
      {
        host: virtualContributorPayload, // Using VC as placeholder
        invitee: virtualContributorPayload,
        ...spacePayload,
      };
    return result;
  }

  async buildOrganizationSpaceCommunityInvitationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    organizationID: string,
    space: ISpace,
    spacesToJoin: ISpace[],
    extraRoles: RoleName[],
    welcomeMessage?: string,
    recipientEmail?: string
  ): Promise<NotificationEventPayloadSpaceCommunityInvitationOrganization> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const organization =
      await this.actorLookupService.getFullActorByIdOrFail(organizationID);
    if (!organization.profile) {
      throw new EntityNotFoundException(
        'Unable to find Organization profile',
        LogContext.COMMUNITY,
        { organizationID }
      );
    }
    const organizationPayload: ContributorPayload = {
      id: organization.id,
      profile: {
        displayName: organization.profile.displayName,
        url: this.urlGeneratorService.createUrlForContributor(organization),
      },
      type: getActorType(organization),
    };
    const spacesToJoinPayload = await Promise.all(
      spacesToJoin.map(async spaceToJoin => ({
        displayName: spaceToJoin.about.profile.displayName,
        url: await this.urlGeneratorService.generateUrlForProfile(
          spaceToJoin.about.profile
        ),
      }))
    );

    const result: NotificationEventPayloadSpaceCommunityInvitationOrganization =
      {
        invitee: organizationPayload,
        welcomeMessage,
        organizationInvitationsUrl:
          this.urlGeneratorService.createUrlForOrganizationSettingsInvitations(
            organization.nameID
          ),
        extraRoles: extraRoles.map(role => role.toString()),
        spacesToJoin: spacesToJoinPayload,
        ...(recipientEmail ? { recipientEmail } : {}),
        ...spacePayload,
      };
    return result;
  }

  async buildOrganizationSpaceCommunityInvitationOutcomePayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    organizationID: string,
    space: ISpace
  ): Promise<NotificationEventPayloadSpaceCommunityInvitation> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const organizationPayload =
      await this.getContributorPayloadOrFail(organizationID);
    const result: NotificationEventPayloadSpaceCommunityInvitation = {
      invitee: organizationPayload,
      ...spacePayload,
    };
    return result;
  }

  async buildSpaceCommunityExternalInvitationCreatedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    invitedUserEmail: string,
    space: ISpace,
    message?: string
  ): Promise<NotificationEventPayloadSpaceCommunityInvitationPlatform> {
    const recipients: UserPayload[] = [
      {
        email: invitedUserEmail,
        firstName: '',
        lastName: '',
        id: '',
        type: ActorType.USER,
        profile: {
          url: '',
          displayName: '',
        },
      },
    ];
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      [],
      space
    );
    const payload: NotificationEventPayloadSpaceCommunityInvitationPlatform = {
      recipients,
      welcomeMessage: message,
      space: spacePayload.space,
      triggeredBy: spacePayload.triggeredBy,
      eventType,
      platform: spacePayload.platform,
    };

    return payload;
  }

  async buildSpaceCollaborationCreatedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputCollaborationCalloutContributionCreated
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const callout = eventData.callout;
    const contribution = eventData.contribution;

    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );

    // Determine the contribution type and generate appropriate URL and payload
    let contributionPayload: CalloutContributionPayload;

    if (contribution.post) {
      const postURL = await this.urlGeneratorService.getPostUrlPath(
        contribution.post.id
      );
      contributionPayload = {
        id: contribution.post.id,
        type: CalloutContributionType.POST,
        createdBy: await this.getContributorPayloadOrFail(
          contribution.createdBy || contribution.post.createdBy
        ),
        displayName: contribution.post.profile.displayName,
        description: contribution.post.profile.description ?? '',
        url: postURL,
      };
    } else if (contribution.whiteboard) {
      const whiteboardURL = await this.urlGeneratorService.getWhiteboardUrlPath(
        contribution.whiteboard.id,
        contribution.whiteboard.nameID
      );
      contributionPayload = {
        id: contribution.whiteboard.id,
        type: CalloutContributionType.WHITEBOARD,
        createdBy: await this.getContributorPayloadOrFail(
          contribution.createdBy || contribution.whiteboard.createdBy || ''
        ),
        displayName: contribution.whiteboard.profile.displayName,
        description: contribution.whiteboard.profile.description ?? '',
        url: whiteboardURL,
      };
    } else if (contribution.link) {
      contributionPayload = {
        id: contribution.link.id,
        type: CalloutContributionType.LINK,
        createdBy: await this.getContributorPayloadOrFail(
          contribution.createdBy || ''
        ),
        displayName: contribution.link.profile.displayName,
        description: contribution.link.profile.description ?? '',
        url: calloutURL, // no uri on link creation, use callout URL instead
      };
    } else if (contribution.memo) {
      contributionPayload = {
        id: contribution.memo.id,
        type: CalloutContributionType.MEMO,
        createdBy: await this.getContributorPayloadOrFail(
          contribution.createdBy || contribution.memo.createdBy || ''
        ),
        displayName: contribution.memo.profile.displayName,
        description: contribution.memo.profile.description ?? '',
        url: await this.urlGeneratorService.getMemoUrlPath(
          contribution.memo.id,
          contribution.memo.nameID
        ),
      };
    } else if (contribution.collaboraDocument) {
      contributionPayload = {
        id: contribution.collaboraDocument.id,
        type: CalloutContributionType.COLLABORA_DOCUMENT,
        createdBy: await this.getContributorPayloadOrFail(
          contribution.createdBy ||
            contribution.collaboraDocument.createdBy ||
            ''
        ),
        displayName: contribution.collaboraDocument.profile?.displayName ?? '',
        description: contribution.collaboraDocument.profile?.description ?? '',
        // Collabora documents have no client deep-link route — the client opens
        // them in a dialog from the callout page — so the canonical URL is the
        // containing callout (mirrors UrlGeneratorService + the link branch).
        url: calloutURL,
      };
    } else {
      throw new RelationshipNotFoundException(
        'No valid contribution type found (post, whiteboard, link, memo, or collabora document)',
        LogContext.NOTIFICATIONS,
        {
          contribution: contribution.id,
          allowedTypes: callout.settings.contribution.allowedTypes,
        }
      );
    }

    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        id: callout.id,
        framing: {
          id: callout.framing.id,
          displayName: callout.framing.profile.displayName,
          url: calloutURL,
          description: callout.framing.profile.description ?? '',
          type: callout.framing.type,
        },
        contribution: contributionPayload,
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCollaborationCalloutCommentPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputCollaborationCalloutComment
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const callout = eventData.callout;

    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );

    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        id: callout.id,
        framing: {
          id: callout.framing.id,
          type: callout.framing.type,
          displayName: callout.framing.profile.displayName,
          description: callout.framing.profile.description ?? '',
          url: calloutURL,
        },
      },
      ...spacePayload,
    };

    return payload;
  }

  public async buildSpaceCollaborationCalloutPublishedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    callout: ICallout
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        id: callout.id,
        framing: {
          id: callout.framing.id,
          displayName: callout.framing.profile.displayName,
          description: callout.framing.profile.description ?? '',
          type: callout.framing.type,
          url: calloutURL,
        },
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCollaborationCalloutPostContributionCommentPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputCollaborationCalloutPostContributionComment
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const post = eventData.post;
    const callout = eventData.callout;

    const messageResult = eventData.commentSent;

    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      eventData.callout.id
    );
    const postURL = await this.urlGeneratorService.getPostUrlPath(post.id);
    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        id: callout.id,
        framing: {
          id: callout.framing.id,
          displayName: callout.framing.profile.displayName,
          description: callout.framing.profile.description ?? '',
          type: callout.framing.type,
          url: calloutURL,
        },
        contribution: {
          id: post.id,
          displayName: post.profile.displayName,
          description: post.profile.description ?? '',
          createdBy: await this.getContributorPayloadOrFail(post.createdBy),
          type: CalloutContributionType.POST,
          url: postURL,
        },
      },
      comment: {
        message: messageResult.message,
        createdBy: await this.getContributorPayloadByAgentIdOrFail(
          messageResult.sender
        ),
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCommunityNewMemberPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    actorID: string
  ): Promise<NotificationEventPayloadSpaceCommunityContributor> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const memberPayload = await this.getContributorPayloadOrFail(actorID);
    const payload: NotificationEventPayloadSpaceCommunityContributor = {
      contributor: memberPayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCommunicationUpdateSentNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    updates: IRoom,
    lastMessage?: IMessage
  ): Promise<NotificationEventPayloadSpaceCommunicationUpdate> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const payload: NotificationEventPayloadSpaceCommunicationUpdate = {
      update: {
        id: updates.id,
        createdBy: await this.getContributorPayloadOrFail(triggeredBy),
        url: 'not used',
      },
      message: lastMessage?.message,
      ...spacePayload,
    };

    return payload;
  }

  /**
   * Builds the payload for calendar event created notifications.
   *
   * The payload includes calendar event details (title, type, createdBy, url) that will be available
   * once the @alkemio/notifications-lib is updated to support an optional calendarEvent field
   * in NotificationEventPayloadSpace.
   *
   * This allows the email template in the notifications service to format messages as:
   * Subject: New [event type] scheduled in [(sub)space name]
   * Body: Hi [recipient name], [creator name] scheduled a new [event type] in the [(sub)space name] calendar: [event title].
   *
   * The in-app notification payload also includes these fields for the client/UI.
   */
  async buildSpaceCommunityCalendarEventCreatedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    calendarEvent: ICalendarEvent
  ): Promise<NotificationEventPayloadSpaceCalendarEvent> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );

    // Load the user who created the calendar event
    const createdByUser = await this.getUserPayloadOrFail(
      calendarEvent.createdBy
    );

    // Generate URL for the calendar event
    const calendarEventUrl =
      await this.urlGeneratorService.getCalendarEventUrlPath(calendarEvent.id);

    const startDateIso = toIsoString(calendarEvent.startDate, 'startDate');
    const endDateIso = toIsoString(
      calculateCalendarEventEndDate(calendarEvent).toISOString(),
      'endDate'
    );
    validateCalendarDateRange(
      startDateIso,
      endDateIso,
      calendarEvent.id,
      calendarEvent.wholeDay
    );

    const description = calendarEvent.profile?.description ?? undefined;
    const location = formatLocation(calendarEvent.profile?.location);

    const calendarEventData: CalendarEventCalendarData = {
      id: calendarEvent.id,
      title: calendarEvent.profile.displayName,
      url: calendarEventUrl,
      startDate: startDateIso,
      endDate: endDateIso,
      wholeDay: calendarEvent.wholeDay,
      description,
      location,
    };

    const icsRestUrl = this.urlGeneratorService.getCalendarEventIcsRestUrl(
      calendarEvent.id
    );
    const calendarUrls = generateCalendarUrls(calendarEventData, icsRestUrl);

    return {
      ...spacePayload,
      calendarEvent: {
        id: calendarEvent.id,
        title: calendarEvent.profile.displayName,
        type: calendarEvent.type,
        createdBy: createdByUser,
        url: calendarEventUrl,
        startDate: startDateIso,
        endDate: endDateIso,
        wholeDay: calendarEvent.wholeDay,
        description,
        location,
        googleCalendarUrl: calendarUrls.googleCalendarUrl,
        outlookCalendarUrl: calendarUrls.outlookCalendarUrl,
        icsDownloadUrl: calendarUrls.icsDownloadUrl,
      },
    };
  }

  async buildSpaceCommunityCalendarEventCommentPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    calendarEvent: ICalendarEvent,
    comment: IMessage
  ): Promise<any> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );

    // Load the user who created the calendar event
    const createdByUser = await this.getUserPayloadOrFail(
      calendarEvent.createdBy
    );

    const commenter = await this.getUserPayloadOrFail(comment.sender);
    const commentPreview = comment.message.substring(0, 200);

    // Generate URL for the calendar event
    const calendarEventUrl =
      await this.urlGeneratorService.getCalendarEventUrlPath(calendarEvent.id);

    return {
      ...spacePayload,
      calendarEvent: {
        ...calendarEvent,
        title: calendarEvent.profile.displayName,
        url: calendarEventUrl,
        startDate: toIsoString(calendarEvent.startDate, 'startDate'),
        endDate: toIsoString(
          calculateCalendarEventEndDate(calendarEvent).toISOString(),
          'endDate'
        ),
        createdBy: createdByUser,
        googleCalendarUrl: calendarEvent.googleCalendarUrl ?? '',
        outlookCalendarUrl: calendarEvent.outlookCalendarUrl ?? '',
        icsDownloadUrl: calendarEvent.icsDownloadUrl ?? '',
      },
      comment: {
        text: commentPreview,
        sender: commenter,
      },
    };
  }

  async buildSpaceCollaborationPollPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    callout: ICallout,
    poll: { id: string; title: string } | undefined
  ): Promise<
    | NotificationEventPayloadSpacePollVoteCastOnOwnPoll
    | NotificationEventPayloadSpacePollVoteCastOnPollIVotedOn
    | NotificationEventPayloadSpacePollModifiedOnPollIVotedOn
    | NotificationEventPayloadSpacePollVoteAffectedByOptionChange
  > {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );

    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );

    return {
      ...spacePayload,
      poll: {
        id: poll?.id ?? '',
        title: poll?.title ?? '',
        calloutId: callout.id,
        calloutTitle: callout.framing.profile.displayName,
        calloutUrl: calloutURL,
      },
    };
  }

  /**
   * Builds the AMQP payload for a callout-reaction email notification.
   * The shape is no-content-by-construction: framing.description is always
   * empty so no callout body is ever transmitted.
   */
  async buildSpaceCollaborationCalloutReactionPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    calloutId: string,
    calloutDisplayName: string,
    emoji: string
  ): Promise<NotificationEventPayloadSpaceCollaborationCalloutReaction> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL =
      await this.urlGeneratorService.getCalloutUrlPath(calloutId);

    return {
      ...spacePayload,
      callout: {
        id: calloutId,
        framing: {
          id: '',
          type: '',
          displayName: calloutDisplayName,
          description: '',
          url: calloutURL,
        },
      },
      reaction: { emoji },
    };
  }

  async buildPlatformSpaceCreatedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace
  ): Promise<NotificationEventPayloadPlatformSpaceCreated> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const sender = await this.getContributorPayloadOrFail(triggeredBy);

    return {
      sender: {
        name: sender.profile.displayName,
        url: sender.profile.url,
      },
      created: Date.now(),
      ...spacePayload,
    };
  }

  async buildUserSpaceCommunityApplicationDeclinedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    userID: string,
    space: ISpace
  ): Promise<NotificationEventPayloadSpaceCommunityApplication> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const applicantPayload = await this.getContributorPayloadOrFail(userID);
    const payload: NotificationEventPayloadSpaceCommunityApplication = {
      applicant: applicantPayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildPlatformGlobalRoleChangedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    userID: string,
    type: RoleChangeType,
    role: string
  ): Promise<NotificationEventPayloadPlatformGlobalRole> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const userPayload = await this.getUserPayloadOrFail(userID);
    const result: NotificationEventPayloadPlatformGlobalRole = {
      user: userPayload,
      type,
      role,
      ...basePayload,
    };
    return result;
  }

  async buildUserEmailChangeGlobalAdminNotificationPayload(
    eventType: NotificationEvent,
    eventData: NotificationInputUserEmailChangeGlobalAdmin,
    recipients: IUser[]
  ): Promise<UserEmailChangeGlobalAdminNotificationPayload> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      eventData.triggeredBy,
      recipients
    );
    const result: UserEmailChangeGlobalAdminNotificationPayload = {
      subjectProfileSummary: eventData.subjectProfileSummary,
      oldEmail: eventData.oldEmail,
      newEmail: eventData.newEmail,
      initiatorProfileSummary: eventData.initiatorProfileSummary,
      initiatorRole: eventData.initiatorRole,
      approver: eventData.approver,
      reason: eventData.reason,
      commitTimestampISO8601: eventData.commitTimestampISO8601,
      triggerOutcome: eventData.triggerOutcome,
      subjectMemberships: eventData.subjectMemberships,
      subjectGlobalRoles: eventData.subjectGlobalRoles,
      ...basePayload,
    };
    return result;
  }

  async buildUserEmailChangeSpaceAdminNotificationPayload(
    eventType: NotificationEvent,
    eventData: NotificationInputUserEmailChangeSpaceAdmin,
    recipients: IUser[],
    space: ISpace
  ): Promise<UserEmailChangeSpaceAdminNotificationPayload> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      eventData.triggeredBy,
      recipients,
      space
    );
    const result: UserEmailChangeSpaceAdminNotificationPayload = {
      subjectProfileSummary: eventData.subjectProfileSummary,
      oldEmail: eventData.oldEmail,
      newEmail: eventData.newEmail,
      initiatorProfileSummary: eventData.initiatorProfileSummary,
      initiatorRole: eventData.initiatorRole,
      commitTimestampISO8601: eventData.commitTimestampISO8601,
      triggerOutcome: eventData.triggerOutcome,
      ...spacePayload,
    };
    return result;
  }

  async buildPlatformUserRegisteredNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    userID: string
  ): Promise<NotificationEventPayloadPlatformUserRegistration> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const userPayload = await this.getUserPayloadOrFail(userID);

    const result: NotificationEventPayloadPlatformUserRegistration = {
      user: userPayload,
      ...basePayload,
    };
    return result;
  }

  public async buildPlatformUserRemovedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    user: IUser,
    triggeredByPayload?: UserPayload
  ): Promise<NotificationEventPayloadPlatformUserRemoved> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients,
      triggeredByPayload
    );
    const result: NotificationEventPayloadPlatformUserRemoved = {
      user: {
        displayName: this.resolveUserDisplayName(user),
        email: user.email,
      },
      ...basePayload,
    };
    return result;
  }

  async buildPlatformForumCommentCreatedOnDiscussionPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    discussion: IDiscussion,
    message: IMessage
  ): Promise<NotificationEventPayloadPlatformForumDiscussion> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const discussionURL =
      await this.urlGeneratorService.getForumDiscussionUrlPath(discussion.id);
    const payload: NotificationEventPayloadPlatformForumDiscussion = {
      discussion: {
        id: discussion.id,
        displayName: discussion.profile.displayName,
        createdBy: await this.getContributorPayloadOrFail(discussion.createdBy),
        url: discussionURL,
      },
      comment: {
        message: message.message,
        createdBy: await this.getContributorPayloadByAgentIdOrFail(
          message.sender
        ),
        url: '',
      },
      ...basePayload,
    };

    return payload;
  }

  async buildPlatformForumDiscussionCreatedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    discussion: IDiscussion
  ): Promise<NotificationEventPayloadPlatformForumDiscussion> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const discussionURL =
      await this.urlGeneratorService.getForumDiscussionUrlPath(discussion.id);
    const payload: NotificationEventPayloadPlatformForumDiscussion = {
      ...basePayload,
      discussion: {
        id: discussion.id,
        createdBy: await this.getContributorPayloadOrFail(discussion.createdBy),
        displayName: discussion.profile.displayName,
        url: discussionURL,
      },
    };

    return payload;
  }

  async buildUserMessageSentNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    receiverID: string,
    message: string
  ): Promise<NotificationEventPayloadUserMessageDirect> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const user = await this.getUserPayloadOrFail(receiverID);
    const payload: NotificationEventPayloadUserMessageDirect = {
      user,
      message,
      ...basePayload,
    };

    return payload;
  }

  /**
   * 034-messaging-notifications (contract C-2, data-model.md §3, FR-008/FR-009).
   * REVISED for Operator Ruling R4 / D-22 — a per-recipient DIGEST.
   *
   * Wire contract (`NotificationEventPayloadUserConversationMessageDirect` /
   * `...Group`, both owned by `@alkemio/notifications-lib` >= 0.19.0 and
   * asserted on both sides):
   *  - NO message-content field exists (FR-008, by construction).
   *  - `recipients` has EXACTLY ONE entry — the digest is per recipient.
   *  - `senders` / `conversations` is NEVER empty: a track that finds nothing
   *    unread emits nothing at all (FR-018).
   *  - `totalCount === sum(entries[].count)` and is therefore `>= 1`.
   *  - `triggeredBy.email === ''` — sender PII never rides the durable queue.
   *
   * Deliberately does NOT reuse `buildBaseEventPayload` — that helper's
   * `triggeredBy` carries the sender's REAL email address, which is the
   * exact leak this feature must not repeat (the unanimous council finding
   * against reusing `USER_MESSAGE`/its template). `triggeredBy.email` is
   * explicitly zeroed here; `recipients[].email` remains — it is the
   * delivery address, and there is exactly ONE recipient on a digest.
   *
   * On `triggeredBy`: a digest has no single sender — it is assembled at fire
   * time from the recipient's unread signal, and the arrival path stores only
   * conversation ids (data-model §5), never a sender. `triggeredBy` is
   * therefore filled with the RECIPIENT's own (email-zeroed) payload purely to
   * satisfy `BaseEventPayload`'s non-optional field. It identifies nobody else
   * and templates MUST NOT render it — the digest names counterparts via
   * `senders[]`. See the deviation note in the feature report.
   *
   * sec-server-4: entry display names are user-controlled profile/room text,
   * NOT trusted platform fields — the caller sanitizes them
   * (`sanitizeNotificationCopyText` / `getGroupDisplayNameForNotificationCopy`)
   * before they reach this builder, and they are re-sanitized here so the
   * builder is safe on its own.
   */
  async buildConversationMessageDirectPayload(
    eventType: NotificationEvent,
    recipient: IUser,
    entries: ConversationDigestEntry[]
  ): Promise<NotificationEventPayloadUserConversationMessageDirect> {
    const recipientPayload = this.createUserPayloadFromUser(recipient);
    const senders = entries.map(entry => this.sanitizeDigestEntry(entry));

    return {
      eventType,
      triggeredBy: { ...recipientPayload, email: '' },
      recipients: [recipientPayload],
      platform: { url: this.getPlatformURL() },
      senders,
      totalCount: senders.reduce((total, entry) => total + entry.count, 0),
    };
  }

  /**
   * 034-messaging-notifications — group digest variant. See
   * `buildConversationMessageDirectPayload` for the `triggeredBy` and
   * sanitization rationale.
   *
   * The group digest names CONVERSATIONS, not people: there is deliberately
   * no sender-identity field anywhere on this payload (FR-018a).
   */
  async buildConversationMessageGroupPayload(
    eventType: NotificationEvent,
    recipient: IUser,
    entries: ConversationDigestEntry[]
  ): Promise<NotificationEventPayloadUserConversationMessageGroup> {
    const recipientPayload = this.createUserPayloadFromUser(recipient);
    const conversations = entries.map(entry => this.sanitizeDigestEntry(entry));

    return {
      eventType,
      triggeredBy: { ...recipientPayload, email: '' },
      recipients: [recipientPayload],
      platform: { url: this.getPlatformURL() },
      conversations,
      totalCount: conversations.reduce(
        (total, entry) => total + entry.count,
        0
      ),
    };
  }

  private sanitizeDigestEntry(
    entry: ConversationDigestEntry
  ): ConversationDigestEntry {
    return {
      ...entry,
      displayName: sanitizeNotificationCopyText(entry.displayName),
    };
  }

  async buildOrganizationMentionNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    organizationID: string,
    messageDetails: MessageDetails
  ): Promise<NotificationEventPayloadOrganizationMessageRoom> {
    const orgData = await this.getContributorPayloadOrFail(organizationID);

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const payload: NotificationEventPayloadOrganizationMessageRoom = {
      organization: orgData,
      comment: messageDetails.message,
      commentOrigin: {
        url: messageDetails.parent.url,
        displayName: messageDetails.parent.displayName,
      },
      ...basePayload,
    };

    return payload;
  }

  async buildOrganizationMessageNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    message: string,
    organizationID: string
  ): Promise<NotificationEventPayloadOrganizationMessageDirect> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const orgContributor =
      await this.getContributorPayloadOrFail(organizationID);
    const payload: NotificationEventPayloadOrganizationMessageDirect = {
      message,
      organization: orgContributor,
      ...basePayload,
    };

    return payload;
  }

  async buildSpaceCommunicationMessageDirectNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    message: string
  ): Promise<NotificationEventPayloadSpaceCommunicationMessageDirect> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const payload: NotificationEventPayloadSpaceCommunicationMessageDirect = {
      message,
      ...spacePayload,
    };

    return payload;
  }

  async buildUserCommentReplyPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    data: NotificationInputCommentReply,
    messageDetails: MessageDetails
  ): Promise<NotificationEventPayloadUserMessageRoomReply> {
    const user = await this.getUserPayloadOrFail(data.messageRepliedToOwnerID);

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const payload: NotificationEventPayloadUserMessageRoomReply = {
      user,
      reply: messageDetails.message,
      comment: {
        commentUrl: messageDetails.parent.url,
        commentOrigin: messageDetails.parent.displayName,
        commentOwnerId: data.messageRepliedToOwnerID,
      },
      ...basePayload,
    };

    return payload;
  }

  async buildUserMentionNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    mentionedUserUUID: string,
    messageDetails: MessageDetails
  ): Promise<NotificationEventPayloadUserMessageRoom> {
    const userContributor = await this.getUserPayloadOrFail(mentionedUserUUID);

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    //const userURL = await this.urlGeneratorService.
    const payload: NotificationEventPayloadUserMessageRoom = {
      user: userContributor,
      comment: messageDetails.message,
      commentOrigin: {
        url: messageDetails.parent.url,
        displayName: messageDetails.parent.displayName,
      },
      ...basePayload,
    };

    return payload;
  }

  private async buildSpacePayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace
  ): Promise<NotificationEventPayloadSpace> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );

    const url = await this.urlGeneratorService.generateUrlForProfile(
      space.about.profile
    );
    const spaceCommunityAdminUrl =
      await this.urlGeneratorService.createSpaceAdminCommunityURL(space.id);
    const result: NotificationEventPayloadSpace = {
      space: {
        id: space.id,
        level: space.level.toString(),
        profile: {
          displayName: space.about.profile.displayName,
          url: url,
        },
        adminURL: spaceCommunityAdminUrl,
      },
      ...basePayload,
    };

    return result;
  }

  private async buildBaseEventPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    triggeredByPayload?: UserPayload
  ): Promise<BaseEventPayload> {
    const contributor =
      triggeredByPayload ?? (await this.getUserPayloadOrFail(triggeredBy));
    const result: BaseEventPayload = {
      eventType,
      triggeredBy: contributor,
      recipients: recipients.map(recipient =>
        this.createUserPayloadFromUser(recipient)
      ),
      platform: {
        url: this.getPlatformURL(),
      },
    };

    return result;
  }

  private async getContributorPayloadOrFail(
    actorID: string
  ): Promise<ContributorPayload> {
    const contributor = await this.actorLookupService.getFullActorByIdOrFail(
      actorID,
      {
        relations: {
          profile: true,
        },
      }
    );

    if (!contributor || !contributor.profile) {
      throw new EntityNotFoundException(
        `Unable to find Contributor with profile for id: ${actorID}`,
        LogContext.COMMUNITY
      );
    }

    const actorType = getActorType(contributor);

    const contributorURL =
      this.urlGeneratorService.createUrlForContributor(contributor);
    const result: ContributorPayload = {
      id: contributor.id,
      profile: {
        displayName: contributor.profile.displayName,
        url: contributorURL,
      },
      type: actorType,
    };
    return result;
  }

  private async getContributorPayloadByAgentIdOrFail(
    actorID: string
  ): Promise<ContributorPayload> {
    const contributor = await this.actorLookupService.getFullActorByIdOrFail(
      actorID,
      {
        relations: {
          profile: true,
        },
      }
    );

    if (!contributor || !contributor.profile) {
      throw new EntityNotFoundException(
        `Unable to find Contributor with profile for agent id: ${actorID}`,
        LogContext.COMMUNITY
      );
    }

    const actorType = getActorType(contributor);

    const contributorURL =
      this.urlGeneratorService.createUrlForContributor(contributor);
    const result: ContributorPayload = {
      id: contributor.id,
      profile: {
        displayName: contributor.profile.displayName,
        url: contributorURL,
      },
      type: actorType,
    };
    return result;
  }

  private async getUserPayloadOrFail(userID: string): Promise<UserPayload> {
    const user = await this.userLookupService.getUserByIdOrFail(userID, {
      relations: {
        profile: true,
      },
    });

    const userURL = this.urlGeneratorService.createUrlForUserNameID(
      user.nameID
    );
    const result: UserPayload = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profile: {
        displayName: this.resolveUserDisplayName(user),
        url: userURL,
      },
      type: ActorType.USER,
    };
    return result;
  }

  /**
   * Builds a `UserPayload` straight from an already-loaded `IUser`, with no
   * DB lookup. Exposed for callers that must resolve a notification's
   * initiator payload BEFORE an action that removes the initiator's own row
   * — e.g. self-account deletion, where the initiator IS the departed user
   * and a post-deletion lookup by id would fail.
   */
  public createUserPayloadFromUser(user: IUser): UserPayload {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profile: {
        displayName: this.resolveUserDisplayName(user),
        url: this.urlGeneratorService.createUrlForUserNameID(user.nameID),
      },
      type: ActorType.USER,
    };
  }

  /**
   * A notification payload must never be the thing that takes a request — or
   * the process — down.
   *
   * Every caller of the three payload builders that read `profile.displayName`
   * loads the user with `relations: { profile: true }`, so a null profile means
   * the ROW is incomplete, not that the relation was forgotten. Dereferencing
   * it unguarded turned one such row into a `TypeError`, and because
   * `notifyPlatformGlobalRoleChange` invokes its builder without `await` and
   * without a catch, that rejection reached Node's default
   * `--unhandled-rejections=throw` and killed the server outright — observed
   * twice during live verification of workspace#027-platform-role-redesign,
   * once via role revocation and once via `createDiscussion`.
   *
   * Falls back to the user's name, then their email, so the notification still
   * carries a usable human identifier instead of failing to send.
   */
  private resolveUserDisplayName(user: IUser): string {
    return (
      user.profile?.displayName ||
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
      user.email
    );
  }

  private getPlatformURL(): string {
    return this.configService.get('hosting.endpoint_cluster', { infer: true });
  }

  private async getContributorPayloadOrEmpty(
    actorID: string | undefined
  ): Promise<ContributorPayload> {
    if (!actorID) {
      return {
        id: '',
        profile: {
          displayName: '',
          url: '',
        },
        type: ActorType.USER,
      };
    }

    return await this.getContributorPayloadOrFail(actorID);
  }
}
