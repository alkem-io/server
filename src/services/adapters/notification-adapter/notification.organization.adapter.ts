import { ActorType } from '@common/enums/actor.type';
import { CommunityMembershipOrigin } from '@common/enums/community.membership.origin';
import { LogContext } from '@common/enums/logging.context';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { IRoleSet } from '@domain/access/role-set';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { forwardRef, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { InAppNotificationPayloadOrganizationAssociateActor } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.associate.actor';
import { InAppNotificationPayloadOrganizationMessageDirect } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.direct';
import { InAppNotificationPayloadOrganizationMessageRoom } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.room';
import { InAppNotificationPayloadSpaceCommunityActor } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.actor';
import { InAppNotificationPayloadSpaceCommunityInvitation } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.invitation';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationPushAdapter } from '../notification-push-adapter/notification.push.adapter';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationInputOrganizationAssociateApplicationCreated } from './dto/organization/notification.dto.input.organization.associate.application.created';
import { NotificationInputOrganizationAssociateInvitationOutcome } from './dto/organization/notification.dto.input.organization.associate.invitation.outcome';
import { NotificationInputOrganizationAssociateJoined } from './dto/organization/notification.dto.input.organization.associate.joined';
import { NotificationInputOrganizationMention } from './dto/organization/notification.dto.input.organization.mention';
import { NotificationInputOrganizationSpaceCommunityInvitation } from './dto/organization/notification.dto.input.organization.space.community.invitation';
import { NotificationInputOrganizationSpaceCommunityJoined } from './dto/organization/notification.dto.input.organization.space.community.joined';
import { NotificationInputOrganizationMessage } from './dto/organization/notification.input.organization.message';
import { NotificationAdapter } from './notification.adapter';

@Injectable()
export class NotificationOrganizationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationAdapter: NotificationAdapter,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private notificationPushAdapter: NotificationPushAdapter,
    private messageDetailsService: MessageDetailsService,
    private actorLookupService: ActorLookupService,
    private communityResolverService: CommunityResolverService,
    private urlGeneratorService: UrlGeneratorService,
    private spaceLookupService: SpaceLookupService,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(forwardRef(() => RoleSetService))
    private roleSetService: RoleSetService
  ) {}

  public async organizationMention(
    eventData: NotificationInputOrganizationMention
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_ADMIN_MENTIONED;
    const recipients = await this.getNotificationRecipientsOrganization(
      event,
      eventData,
      eventData.organizationID
    );
    const messageDetails = await this.messageDetailsService.getMessageDetails(
      eventData.roomID,
      eventData.messageID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationMentionNotificationPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.organizationID,
          messageDetails
        );

      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // In-app notification
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadOrganizationMessageRoom = {
        type: NotificationEventPayload.ORGANIZATION_MESSAGE_ROOM,
        organizationID: eventData.organizationID,
        roomID: eventData.roomID,
        messageID: eventData.messageID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.ORGANIZATION_ADMIN_MENTIONED,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    // Send push notifications
    // The actor who caused the event is excluded: they just mentioned their own
    // organization and do not need a push telling them so. Pre-existing
    // behaviour, unrelated to feature 061 — R34 removed this filter from the
    // *invitation* dispatch only, because an invitation is a call to action
    // rather than an FYI. A mention IS an FYI, so the filter stays.
    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: 'Organization mentioned',
          body: 'Your organization was mentioned in a conversation',
          url: '/',
        }
      );
    }
  }

  public async organizationSendMessage(
    eventData: NotificationInputOrganizationMessage
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_ADMIN_MESSAGE;
    const recipients = await this.getNotificationRecipientsOrganization(
      event,
      eventData,
      eventData.organizationID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationMessageNotificationPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.message,
          eventData.organizationID
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // In-app notification
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadOrganizationMessageDirect = {
        type: NotificationEventPayload.ORGANIZATION_MESSAGE_DIRECT,
        organizationID: eventData.organizationID,
        message: eventData.message,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.ORGANIZATION_ADMIN_MESSAGE,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    // Send push notifications
    // The sender is excluded: they receive the separate
    // ORGANIZATION_MESSAGE_SENDER dispatch below, and would otherwise be pushed
    // twice for one message. Pre-existing behaviour, unrelated to feature 061 —
    // R34 removed this filter from the *invitation* dispatch only, because an
    // invitation is a call to action rather than an FYI. A message IS an FYI,
    // so the filter stays.
    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: 'New organization message',
          body: 'Your organization received a new message',
          url: '/',
        }
      );
    }

    // And for the sender
    const eventSender = NotificationEvent.ORGANIZATION_MESSAGE_SENDER;
    const recipientsSender = await this.getNotificationRecipientsOrganization(
      eventSender,
      eventData,
      eventData.organizationID
    );

    if (recipientsSender.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationMessageNotificationPayload(
          eventSender,
          eventData.triggeredBy,
          recipientsSender.emailRecipients,
          eventData.message,
          eventData.organizationID
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        eventSender,
        payload
      );
    }

    // In-app notification
    const inAppReceiverSenderIDs = recipientsSender.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverSenderIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadOrganizationMessageDirect = {
        type: NotificationEventPayload.ORGANIZATION_MESSAGE_DIRECT,
        organizationID: eventData.organizationID,
        message: eventData.message,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.ORGANIZATION_MESSAGE_SENDER,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverSenderIDs,
        inAppPayload
      );
    }

    // Send push notifications for sender confirmation (include the sender)
    if (recipientsSender.pushRecipients.length > 0) {
      await this.notificationPushAdapter.sendPushNotifications(
        recipientsSender.pushRecipients,
        eventSender,
        {
          title: 'Message sent',
          body: 'Your message to the organization was sent',
          url: '/',
        }
      );
    }
  }

  private async getNotificationRecipientsOrganization(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    organizationID: string
  ): Promise<NotificationRecipientResult> {
    return this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      undefined,
      eventData.triggeredBy,
      organizationID
    );
  }

  /**
   * A Space invited an organization. Notifies every ADMIN of the
   * organization (email, in-app, push) with the inviter, the offered
   * role(s), the message and every Space acceptance would join. When the
   * organization has no administrators, the invitation still
   * exists — only the support escalation email fires, with no recipient
   * lookup and no in-app/push (the organization has nobody to notify).
   */
  public async organizationSpaceCommunityInvitationCreated(
    eventData: NotificationInputOrganizationSpaceCommunityInvitation
  ): Promise<void> {
    const event =
      NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION;
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );
    const roleSetID = await this.communityResolverService.getRoleSetIdForSpace(
      space.id
    );
    const spacesToJoin = roleSetID
      ? await this.roleSetService.getSpacesToJoinOnAccept(
          { id: roleSetID } as IRoleSet,
          eventData.invitedContributorID,
          eventData.invitedToParent
        )
      : [space];

    if (eventData.organizationHasNoAdministrators) {
      const supportEmail = this.configService.get(
        'notifications.organization_invitations.support_email',
        { infer: true }
      );
      const payload =
        await this.notificationExternalAdapter.buildOrganizationSpaceCommunityInvitationPayload(
          event,
          eventData.triggeredBy,
          [],
          eventData.invitedContributorID,
          space,
          spacesToJoin,
          eventData.extraRoles,
          eventData.welcomeMessage,
          supportEmail
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
      this.logger.verbose?.(
        `Organization ${eventData.invitedContributorID} has no administrators — invitation escalated to platform support`,
        LogContext.NOTIFICATIONS
      );
      return;
    }

    const recipients = await this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      undefined,
      undefined,
      eventData.invitedContributorID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationSpaceCommunityInvitationPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.invitedContributorID,
          space,
          spacesToJoin,
          eventData.extraRoles,
          eventData.welcomeMessage
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCommunityInvitation = {
        type: NotificationEventPayload.SPACE_COMMUNITY_INVITATION,
        spaceID: space.id,
        invitationID: eventData.invitationID,
        organizationID: eventData.invitedContributorID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        event,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    // NO per-channel recipient filtering here, deliberately. An invitation is
    // a call to action, not an FYI: unlike the outcome/welcome notifications
    // (R33), the actor must still be told there is something to accept, because
    // a Space admin who is also the invited organization's ONLY admin is the
    // one person who can answer it. Filtering them out of push alone was the
    // exact per-channel split R33 exists to eliminate.
    if (recipients.pushRecipients.length > 0) {
      const organization = await this.actorLookupService.getFullActorByIdOrFail(
        eventData.invitedContributorID,
        { relations: { profile: true } }
      );
      const organizationName =
        organization.profile?.displayName ?? 'your organization';
      const spaceName = space.about?.profile?.displayName ?? 'a Space';
      await this.notificationPushAdapter.sendPushNotifications(
        recipients.pushRecipients,
        event,
        {
          title: `Invitation for ${organizationName} to join ${spaceName}`,
          body: `An admin invited ${organizationName} to join ${spaceName}`,
          url: this.urlGeneratorService.getOrganizationSettingsInvitationsUrlPath(
            organization.nameID
          ),
        }
      );
    }
  }

  /**
   * The organization has joined a Space after one of its admins accepted
   * the invitation. Every ADMIN **except the one who accepted** is
   * notified: the point of this notification is that the *others* learn no
   * action is needed, mirroring the "welcome to the Space" notification a
   * user gets when they accept an invitation themselves. Shares the
   * invitation's settings row: it is the closing half of the same
   * lifecycle.
   *
   * TWO exclusions, both applied on EVERY channel, not just push (R33):
   *
   *  1. the acceptor. They just clicked Accept, so the welcome tells them
   *     nothing: the product email frames this notification as the one that
   *     "informs the OTHERS that no action is needed";
   *  2. anyone the Space-side
   *     SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED outcome will
   *     reach for the same click. An admin of BOTH the organization and the
   *     Space is on both recipient sets, and that is precisely the pair the
   *     brief rules out — "accepting an invite/application shouldn't trigger
   *     a double notification (one for X accepted, immediately followed by X
   *     joined)". The outcome cannot be the side that yields: it is the only
   *     notification co-admins of the Space get about this membership,
   *     because the generic "a new member joined" is suppressed for it.
   */
  public async organizationSpaceCommunityJoined(
    eventData: NotificationInputOrganizationSpaceCommunityJoined
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED;
    const space = await this.spaceLookupService.getSpaceOrFail(
      eventData.spaceID,
      { relations: { about: { profile: true } } }
    );

    const recipients = await this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      undefined,
      undefined,
      eventData.organizationID
    );

    // The Space-side "X accepted the invitation" outcome is dispatched for the
    // SAME click, to every admin of the Space minus the answerer. An admin of
    // BOTH the Space and the invited organization is on both recipient sets,
    // so leaving them here produces exactly the pair the brief rules out —
    // "one for X accepted, immediately followed by X joined". The outcome is
    // the notification that must not be narrowed (it is the only one co-admins
    // of the Space receive about this membership, since the generic "a new
    // member joined" is suppressed for it), so the welcome is the side that
    // yields. Unioned across channels on purpose: being told once on any
    // channel is enough to make a second notification redundant.
    const spaceOutcomeRecipients =
      await this.notificationAdapter.getNotificationRecipients(
        NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED,
        eventData,
        space.id
      );
    const alreadyToldBySpaceOutcome = new Set<string>([
      ...spaceOutcomeRecipients.emailRecipients.map(r => r.id),
      ...spaceOutcomeRecipients.inAppRecipients.map(r => r.id),
      ...spaceOutcomeRecipients.pushRecipients.map(r => r.id),
    ]);

    // Applied once, to every channel — see the docblock. Doing it per
    // channel is how push ended up filtered and email/in-app not.
    const withoutAcceptor = <T extends { id: string }>(list: T[]): T[] =>
      list.filter(
        recipient =>
          recipient.id !== eventData.triggeredBy &&
          !alreadyToldBySpaceOutcome.has(recipient.id)
      );
    const emailRecipients = withoutAcceptor(recipients.emailRecipients);
    const inAppRecipients = withoutAcceptor(recipients.inAppRecipients);
    const pushRecipients = withoutAcceptor(recipients.pushRecipients);

    if (emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildActorSpaceCommunityInvitationOutcomePayload(
          event,
          eventData.triggeredBy,
          emailRecipients,
          eventData.organizationID,
          space
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    const inAppReceiverIDs = inAppRecipients.map(recipient => recipient.id);
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCommunityActor = {
        type: NotificationEventPayload.SPACE_COMMUNITY_ACTOR,
        spaceID: space.id,
        actorID: eventData.organizationID,
        actorType: ActorType.ORGANIZATION,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        event,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    if (pushRecipients.length > 0) {
      const organizationName = await this.getOrganizationDisplayName(
        eventData.organizationID
      );
      const spaceName = space.about?.profile?.displayName ?? 'a Space';
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipients,
        event,
        {
          title: `Welcome to ${spaceName}`,
          body: `${organizationName} is now a member of ${spaceName}`,
          url: await this.urlGeneratorService.getSpaceUrlPathByID(space.id),
        }
      );
    }
  }

  /**
   * The invitee accepted or declined an invitation to associate. Every
   * ADMIN other than the invitee (the acting user) is notified — the
   * invitee is excluded on every channel (R33), and an empty recipient
   * list after the exclusion sends nothing.
   */
  private async organizationAdminAssociateInvitationOutcome(
    event: NotificationEvent,
    eventData: NotificationInputOrganizationAssociateInvitationOutcome
  ): Promise<void> {
    const recipients = await this.getNotificationRecipientsOrganization(
      event,
      eventData,
      eventData.organizationID
    );
    const withoutInvitee = <T extends { id: string }>(list: T[]): T[] =>
      list.filter(recipient => recipient.id !== eventData.inviteeID);
    const emailRecipients = withoutInvitee(recipients.emailRecipients);
    const inAppRecipients = withoutInvitee(recipients.inAppRecipients);
    const pushRecipients = withoutInvitee(recipients.pushRecipients);

    if (emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationAssociateActorPayload(
          event,
          eventData.triggeredBy,
          emailRecipients,
          eventData.organizationID,
          eventData.inviteeID,
          {
            extraRoles: eventData.extraRoles,
            extraRolesWithheld: eventData.extraRolesWithheld,
          }
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    const inAppReceiverIDs = inAppRecipients.map(recipient => recipient.id);
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadOrganizationAssociateActor = {
        type: NotificationEventPayload.ORGANIZATION_ASSOCIATE_ACTOR,
        organizationID: eventData.organizationID,
        actorID: eventData.inviteeID,
        invitationID: eventData.invitationID,
        extraRolesWithheld: eventData.extraRolesWithheld,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        event,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    if (pushRecipients.length > 0) {
      const invitee = await this.actorLookupService.getFullActorByIdOrFail(
        eventData.inviteeID,
        { relations: { profile: true } }
      );
      const inviteeName = invitee?.profile?.displayName ?? 'Someone';
      const outcome =
        event ===
        NotificationEvent.ORGANIZATION_ADMIN_ASSOCIATE_INVITATION_ACCEPTED
          ? 'accepted'
          : 'declined';
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipients,
        event,
        {
          title: `${inviteeName} ${outcome} the invitation to associate`,
          body: `${inviteeName} ${outcome} an invitation to associate with your organisation`,
          url: this.urlGeneratorService.getOrganizationSettingsAssociatesUrlPath(
            (
              await this.actorLookupService.getFullActorByIdOrFail(
                eventData.organizationID
              )
            ).nameID
          ),
        }
      );
    }
  }

  public async organizationAdminAssociateInvitationAccepted(
    eventData: NotificationInputOrganizationAssociateInvitationOutcome
  ): Promise<void> {
    await this.organizationAdminAssociateInvitationOutcome(
      NotificationEvent.ORGANIZATION_ADMIN_ASSOCIATE_INVITATION_ACCEPTED,
      eventData
    );
  }

  public async organizationAdminAssociateInvitationDeclined(
    eventData: NotificationInputOrganizationAssociateInvitationOutcome
  ): Promise<void> {
    await this.organizationAdminAssociateInvitationOutcome(
      NotificationEvent.ORGANIZATION_ADMIN_ASSOCIATE_INVITATION_DECLINED,
      eventData
    );
  }

  /**
   * A user applied to associate with the organization. Every ADMIN is
   * notified with the note in the body only. Zero admins: escalate a
   * single email to platform support (no recipient lookup, no in-app/push
   * — clone of the 061 zero-admin invitation escalation).
   */
  public async organizationAdminAssociateApplicationCreated(
    eventData: NotificationInputOrganizationAssociateApplicationCreated
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_ADMIN_ASSOCIATE_APPLICATION;

    if (eventData.organizationHasNoAdministrators) {
      const supportEmail = this.configService.get(
        'notifications.organization_invitations.support_email',
        { infer: true }
      );
      const payload =
        await this.notificationExternalAdapter.buildOrganizationAssociateActorPayload(
          event,
          eventData.triggeredBy,
          [],
          eventData.organizationID,
          eventData.applicantID,
          {
            applicationMessage: eventData.applicationMessage,
            recipientEmail: supportEmail,
          }
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
      this.logger.verbose?.(
        `Organization ${eventData.organizationID} has no administrators — associate application escalated to platform support`,
        LogContext.NOTIFICATIONS
      );
      return;
    }

    const recipients = await this.getNotificationRecipientsOrganization(
      event,
      eventData,
      eventData.organizationID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationAssociateActorPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.organizationID,
          eventData.applicantID,
          { applicationMessage: eventData.applicationMessage }
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadOrganizationAssociateActor = {
        type: NotificationEventPayload.ORGANIZATION_ASSOCIATE_ACTOR,
        organizationID: eventData.organizationID,
        actorID: eventData.applicantID,
        applicationID: eventData.applicationID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        event,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      const applicant = await this.actorLookupService.getFullActorByIdOrFail(
        eventData.applicantID,
        { relations: { profile: true } }
      );
      const applicantName = applicant?.profile?.displayName ?? 'Someone';
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: `${applicantName} applied to associate`,
          body: `${applicantName} applied to associate with your organisation`,
          url: this.urlGeneratorService.getOrganizationSettingsAssociatesUrlPath(
            (
              await this.actorLookupService.getFullActorByIdOrFail(
                eventData.organizationID
              )
            ).nameID
          ),
        }
      );
    }
  }

  /**
   * A new associate joined the organization directly (application
   * approval, domain join, or a direct assignment) — never for an
   * invitation acceptance, whose response notification is the replacement
   * (FR-010). Both the acting admin/joiner-triggering actor AND the new
   * associate are excluded from every channel; an empty recipient list
   * after exclusion sends nothing.
   */
  public async organizationAdminAssociateJoined(
    eventData: NotificationInputOrganizationAssociateJoined
  ): Promise<void> {
    if (eventData.membershipOrigin !== CommunityMembershipOrigin.DIRECT) {
      this.logger.verbose?.(
        `Associate-joined notification suppressed for organization ${eventData.organizationID}: membershipOrigin=${eventData.membershipOrigin} (invitation response is the replacement)`,
        LogContext.NOTIFICATIONS
      );
      return;
    }

    const event = NotificationEvent.ORGANIZATION_ADMIN_ASSOCIATE_JOINED;
    const recipients = await this.getNotificationRecipientsOrganization(
      event,
      eventData,
      eventData.organizationID
    );
    const excluded = new Set([eventData.triggeredBy, eventData.associateID]);
    const withoutExcluded = <T extends { id: string }>(list: T[]): T[] =>
      list.filter(recipient => !excluded.has(recipient.id));
    const emailRecipients = withoutExcluded(recipients.emailRecipients);
    const inAppRecipients = withoutExcluded(recipients.inAppRecipients);
    const pushRecipients = withoutExcluded(recipients.pushRecipients);

    if (
      emailRecipients.length === 0 &&
      inAppRecipients.length === 0 &&
      pushRecipients.length === 0
    ) {
      this.logger.verbose?.(
        `Associate-joined notification for organization ${eventData.organizationID}: no recipients remain after excluding the acting user and the new associate`,
        LogContext.NOTIFICATIONS
      );
      return;
    }

    if (emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationAssociateActorPayload(
          event,
          eventData.triggeredBy,
          emailRecipients,
          eventData.organizationID,
          eventData.associateID
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    const inAppReceiverIDs = inAppRecipients.map(recipient => recipient.id);
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadOrganizationAssociateActor = {
        type: NotificationEventPayload.ORGANIZATION_ASSOCIATE_ACTOR,
        organizationID: eventData.organizationID,
        actorID: eventData.associateID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        event,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    if (pushRecipients.length > 0) {
      const associate = await this.actorLookupService.getFullActorByIdOrFail(
        eventData.associateID,
        { relations: { profile: true } }
      );
      const associateName = associate?.profile?.displayName ?? 'Someone';
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipients,
        event,
        {
          title: `${associateName} joined the organisation`,
          body: `${associateName} is now an associate of your organisation`,
          url: this.urlGeneratorService.getOrganizationSettingsAssociatesUrlPath(
            (
              await this.actorLookupService.getFullActorByIdOrFail(
                eventData.organizationID
              )
            ).nameID
          ),
        }
      );
    }
  }

  private async getOrganizationDisplayName(
    organizationID: string
  ): Promise<string> {
    try {
      const organization = await this.actorLookupService.getFullActorByIdOrFail(
        organizationID,
        { relations: { profile: true } }
      );
      return organization?.profile?.displayName ?? 'Your organization';
    } catch {
      return 'Your organization';
    }
  }
}
