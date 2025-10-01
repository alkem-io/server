/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { UpdateSpaceInput } from '@domain/space/space/dto/space.dto.update';
import { CreateUserInput, UpdateUserInput } from '@domain/community/user/dto';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { validate, ValidationError } from 'class-validator';
import { AbstractHandler } from './abstract.handler';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '@domain/community/organization/dto';

import {
  CreateUserGroupInput,
  UpdateUserGroupInput,
} from '@domain/community/user-group/dto';
import { CreateSubspaceInput } from '@domain/space/space/dto/space.dto.create.subspace';
import { CreateReferenceOnProfileInput } from '@domain/common/profile/dto/profile.dto.create.reference';
import {
  CreateTagsetOnProfileInput,
  UpdateProfileInput,
} from '@domain/common/profile/dto';
import { ApplicationEventInput } from '@domain/access/application/dto/application.dto.event';
import { OrganizationVerificationEventInput } from '@domain/community/organization-verification/dto/organization.verification.dto.event';
import { RoomSendMessageInput } from '@domain/communication/room/dto/room.dto.send.message';
import { UpdatePostInput } from '@domain/collaboration/post/dto/post.dto.update';
import { UpdateWhiteboardEntityInput } from '@domain/common/whiteboard/types';
import { UpdateDiscussionInput } from '@platform/forum-discussion/dto/discussion.dto.update';
import { SendMessageOnCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.message.created';
import { CreateCalendarEventOnCalendarInput } from '@domain/timeline/calendar/dto/calendar.dto.create.event';
import { UpdateCalendarEventInput } from '@domain/timeline/event';
import { CreateTemplateOnTemplatesSetInput } from '@domain/template/templates-set/dto/templates.set.dto.create.template';
import { UpdateTemplateInput } from '@domain/template/template/dto/template.dto.update';
import { CreateDocumentInput } from '@domain/storage/document/dto/document.dto.create';
import {
  DeleteDocumentInput,
  UpdateDocumentInput,
} from '@domain/storage/document';
import { VisualUploadImageInput } from '@domain/common/visual/dto/visual.dto.upload.image';
import { UpdateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';
import {
  CreateCalloutFramingInput,
  UpdateCalloutFramingInput,
} from '@domain/collaboration/callout-framing/dto';
import {
  CreateCalloutContributionDefaultsInput,
  UpdateCalloutContributionDefaultsInput,
} from '@domain/collaboration/callout-contribution-defaults/dto';
import { CreateContributionOnCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create.contribution';
import {
  CreateLinkInput,
  UpdateLinkInput,
} from '@domain/collaboration/link/dto';
import { UpdateUserPlatformSettingsInput } from '@domain/community/user/dto/user.dto.update.platform.settings';
import { UpdateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-state/dto/innovation.flow.state.dto.update';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { UpdateSpaceSettingsEntityInput } from '@domain/space/space.settings/dto/space.settings.dto.update';
import { UpdateSpaceSettingsInput } from '@domain/space/space/dto/space.dto.update.settings';
import { UpdateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.update';
import { ForumCreateDiscussionInput } from '@platform/forum/dto/forum.dto.create.discussion';
import { CreateCollaborationOnSpaceInput } from '@domain/space/space/dto/space.dto.create.collaboration';
import { ApplyForEntryRoleOnRoleSetInput } from '@domain/access/role-set/dto/role.set.dto.entry.role.apply';
import { InviteForEntryRoleOnRoleSetInput } from '@domain/access/role-set/dto/role.set.dto.entry.role.invite';
import { AssignRoleOnRoleSetToUserInput } from '@domain/access/role-set/dto/role.set.dto.role.assign.user';
import { AssignRoleOnRoleSetToOrganizationInput } from '@domain/access/role-set/dto/role.set.dto.role.assign.organization';
import { AssignRoleOnRoleSetToVirtualContributorInput } from '@domain/access/role-set/dto/role.set.dto.role.assign.virtual';
import { RemoveRoleOnRoleSetFromUserInput } from '@domain/access/role-set/dto/role.set.dto.role.remove.user';
import { RemoveRoleOnRoleSetFromOrganizationInput } from '@domain/access/role-set/dto/role.set.dto.role.remove.organization';
import { RemoveRoleOnRoleSetFromVirtualContributorInput } from '@domain/access/role-set/dto/role.set.dto.role.remove.virtual';
import { UpdateApplicationFormOnRoleSetInput } from '@domain/access/role-set/dto/role.set.dto.update.application.form';
import { JoinAsEntryRoleOnRoleSetInput } from '@domain/access/role-set/dto/role.set.dto.entry.role.join';
import { RolesUserInput } from '@services/api/roles/dto/roles.dto.input.user';
import { InvitationEventInput } from '@domain/access/invitation/dto/invitation.dto.event';
import { UpdateOrganizationSettingsEntityInput } from '@domain/community/organization-settings/dto/organization.settings.dto.update';
import { UpdateOrganizationSettingsMembershipInput } from '@domain/community/organization-settings/dto/organization.settings.membership.dto.update';
import { UpdateOrganizationSettingsPrivacyInput } from '@domain/community/organization-settings/dto/organization.settings.privacy.dto.update';
import { UpdateUserSettingsEntityInput } from '@domain/community/user-settings';
import { UpdateUserSettingsInput } from '@domain/community/user/dto/user.dto.update.settings';
import { UpdateUserSettingsCommunicationInput } from '@domain/community/user-settings/dto/user.settings.communications.dto.update';
import { UpdateUserSettingsPrivacyInput } from '@domain/community/user-settings/dto/user.settings.privacy.dto.update';
import { UpdateOrganizationSettingsInput } from '@domain/community/organization/dto/organization.dto.update.settings';
import { CreateCalloutOnCalloutsSetInput } from '@domain/collaboration/callouts-set/dto/callouts.set.dto.create.callout';
import { UpdateVirtualContributorSettingsEntityInput } from '@domain/community/virtual-contributor-settings';
import { UpdateVirtualContributorSettingsInput } from '@domain/community/virtual-contributor/dto/virtual.contributor.dto.update.settings';
import { UpdateVirtualContributorSettingsPrivacyInput } from '@domain/community/virtual-contributor-settings/dto/virtual.contributor.settings.privacy.dto.update';
import { UpdatePlatformSettingsInput } from '@platform/platform-settings';
import { CreateSpaceAboutInput } from '@domain/space/space.about';
import { UpdateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.update';
import { CreateUserSettingsNotificationInput } from '@domain/community/user-settings/dto/user.settings.notification.dto.create';
import { CreateUserSettingsInput } from '@domain/community/user-settings/dto/user.settings.dto.create';
import { CreateUserSettingsPrivacyInput } from '@domain/community/user-settings/dto/user.settings.privacy.dto.create';
import { CreateUserSettingsCommunicationInput } from '@domain/community/user-settings/dto/user.settings.communications.dto.create';
import { UpdateUserSettingsNotificationInput } from '@domain/community/user-settings/dto/user.settings.notification.dto.update';
import { UpdateBaselineLicensePlanOnAccount } from '@domain/space/account/dto/account.dto.update.baseline.license.plan';
import { CreateUserSettingsNotificationUserInput } from '@domain/community/user-settings/dto/user.settings.notification.user.dto.create';
import { CreateUserSettingsNotificationSpaceInput } from '@domain/community/user-settings/dto/user.settings.notification.space.dto.create';
import { CreateUserSettingsNotificationOrganizationInput } from '@domain/community/user-settings/dto/user.settings.notification.organization.dto.create';
import { CreateUserSettingsNotificationVirtualContributorInput } from '@domain/community/user-settings/dto/user.settings.notification.virtual.contributor.dto.create';
import { CreateUserSettingsNotificationPlatformInput } from '@domain/community/user-settings/dto/user.settings.notification.platform.dto.create';
import { UpdateUserSettingsNotificationUserInput } from '@domain/community/user-settings/dto/user.settings.notification.user.dto.update';
import { UpdateUserSettingsNotificationVirtualContributorInput } from '@domain/community/user-settings/dto/user.settings.notification.virtual.contributor.dto.update';
import { UpdateUserSettingsNotificationPlatformInput } from '@domain/community/user-settings/dto/user.settings.notification.platform.dto.update';
import { UpdateUserSettingsNotificationOrganizationInput } from '@domain/community/user-settings/dto/user.settings.notification.organization.dto.update';
import { CreateUserSettingsNotificationSpaceAdminInput } from '@domain/community/user-settings/dto/user.settings.notification.space.admin.dto.create';
import { UpdateUserSettingsNotificationSpaceAdminInput } from '@domain/community/user-settings/dto/user.settings.notification.space.admin.dto.update';
import { UpdateUserSettingsNotificationSpaceInput } from '@domain/community/user-settings/dto/user.settings.notification.space.dto.update';
import { NotificationSettingInput } from '@domain/community/user-settings/dto/notification.setting.input';
import { UpdateCalloutEntityInput } from '@domain/collaboration/callout/dto';

export class BaseHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    const types: Function[] = [
      AssignRoleOnRoleSetToUserInput,
      AssignRoleOnRoleSetToOrganizationInput,
      AssignRoleOnRoleSetToVirtualContributorInput,
      InvitationEventInput,
      ApplicationEventInput,
      OrganizationVerificationEventInput,
      RemoveRoleOnRoleSetFromUserInput,
      RemoveRoleOnRoleSetFromOrganizationInput,
      RemoveRoleOnRoleSetFromVirtualContributorInput,
      UpdateApplicationFormOnRoleSetInput,
      JoinAsEntryRoleOnRoleSetInput,
      ApplyForEntryRoleOnRoleSetInput,
      RolesUserInput,
      InviteForEntryRoleOnRoleSetInput,
      UpdateInnovationFlowInput,
      RoomSendMessageInput,
      CreateCalloutFramingInput,
      CreateCalloutContributionDefaultsInput,
      CreateSpaceAboutInput,
      CreateContributionOnCalloutInput,
      CreateCollaborationInput,
      CreateCollaborationOnSpaceInput,
      CreateDocumentInput,
      CreateTemplateOnTemplatesSetInput,
      CreateSubspaceInput,
      CreateLinkInput,
      CreateOrganizationInput,
      CreateUserGroupInput,
      CreateUserInput,
      CreateReferenceOnProfileInput,
      CreateTagsetOnProfileInput,
      CreateCalendarEventOnCalendarInput,
      CreateUserSettingsNotificationInput,
      CreateUserSettingsNotificationUserInput,
      CreateUserSettingsNotificationOrganizationInput,
      CreateUserSettingsNotificationVirtualContributorInput,
      CreateUserSettingsNotificationPlatformInput,
      CreateUserSettingsNotificationSpaceInput,
      CreateUserSettingsNotificationSpaceAdminInput,
      CreateUserSettingsPrivacyInput,
      CreateUserSettingsCommunicationInput,
      CreateUserSettingsInput,
      UpdateInnovationFlowStateInput,
      CreateCalloutOnCalloutsSetInput,
      DeleteDocumentInput,
      UpdateSpaceAboutInput,
      UpdatePostInput,
      UpdateDocumentInput,
      UpdateCalloutEntityInput,
      UpdateCalloutFramingInput,
      UpdateCalloutContributionDefaultsInput,
      UpdateTemplateInput,
      UpdateCommunityGuidelinesInput,
      UpdateSpaceInput,
      UpdateSpaceSettingsEntityInput,
      UpdateOrganizationInput,
      UpdateLinkInput,
      UpdateCalendarEventInput,
      UpdateInnovationFlowStateInput,
      UpdateUserGroupInput,
      UpdateUserInput,
      UpdateUserPlatformSettingsInput,
      UpdateProfileInput,
      UpdateWhiteboardEntityInput,
      UpdateDiscussionInput,
      UpdateSpaceSettingsEntityInput,
      UpdateSpaceSettingsInput,
      UpdateOrganizationSettingsInput,
      UpdateOrganizationSettingsEntityInput,
      UpdateOrganizationSettingsMembershipInput,
      UpdateOrganizationSettingsPrivacyInput,
      UpdateVirtualContributorSettingsEntityInput,
      UpdateVirtualContributorSettingsInput,
      UpdateVirtualContributorSettingsPrivacyInput,
      UpdatePlatformSettingsInput,
      UpdateUserSettingsEntityInput,
      UpdateUserSettingsInput,
      UpdateUserSettingsCommunicationInput,
      UpdateUserSettingsPrivacyInput,
      UpdateUserSettingsNotificationInput,
      UpdateUserSettingsNotificationUserInput,
      UpdateUserSettingsNotificationVirtualContributorInput,
      UpdateUserSettingsNotificationPlatformInput,
      UpdateUserSettingsNotificationOrganizationInput,
      UpdateUserSettingsNotificationSpaceInput,
      UpdateUserSettingsNotificationSpaceAdminInput,
      NotificationSettingInput,
      VisualUploadImageInput,
      ForumCreateDiscussionInput,
      SendMessageOnCalloutInput,
      CreateCalloutOnCalloutsSetInput,
      UpdateBaselineLicensePlanOnAccount,
    ];

    if (types.includes(metatype)) {
      const errors = await validate(value);
      if (errors.length > 0) {
        throw new ValidationException(
          `DTO validation for ${metatype} failed! ${errors}`,
          LogContext.API
        );
      }
    }
    return super.handle(value, metatype);
  }
}
