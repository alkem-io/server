/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
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
  CreateCalloutContributionPolicyInput,
  UpdateCalloutContributionPolicyInput,
} from '@domain/collaboration/callout-contribution-policy/dto';
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
import { UpdateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-states/dto/innovation.flow.state.dto.update';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { UpdateSpaceSettingsEntityInput } from '@domain/space/space.settings/dto/space.settings.dto.update';
import { UpdateSpaceSettingsInput } from '@domain/space/space/dto/space.dto.update.settings';
import { UpdateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.update';
import { ForumCreateDiscussionInput } from '@platform/forum/dto/forum.dto.create.discussion';
import { CreateCollaborationOnSpaceInput } from '@domain/space/space/dto/space.dto.create.collaboration';
import { InviteNewContributorForRoleOnRoleSetInput } from '@domain/access/role-set/dto/role.set.dto.platform.invitation.community';
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
import { UpdateOrganizationSettingsEntityInput } from '@domain/community/organization.settings/dto/organization.settings.dto.update';
import { UpdateOrganizationSettingsMembershipInput } from '@domain/community/organization.settings/dto/organization.settings.membership.dto.update';
import { UpdateOrganizationSettingsPrivacyInput } from '@domain/community/organization.settings/dto/organization.settings.privacy.dto.update';
import { UpdateUserSettingsEntityInput } from '@domain/community/user.settings';
import { UpdateUserSettingsInput } from '@domain/community/user/dto/user.dto.update.settings';
import { UpdateUserSettingsCommunicationInput } from '@domain/community/user.settings/dto/user.settings.communications.dto.update';
import { UpdateUserSettingsPrivacyInput } from '@domain/community/user.settings/dto/user.settings.privacy.dto.update';
import { UpdateOrganizationSettingsInput } from '@domain/community/organization/dto/organization.dto.update.settings';
import { CreateCalloutOnCalloutsSetInput } from '@domain/collaboration/callouts-set/dto/callouts.set.dto.create.callout';
import { UpdateVirtualContributorSettingsEntityInput } from '@domain/community/virtual-contributor-settings';
import { UpdateVirtualContributorSettingsInput } from '@domain/community/virtual-contributor/dto/virtual.contributor.dto.update.settings';
import { UpdateVirtualContributorSettingsPrivacyInput } from '@domain/community/virtual-contributor-settings/dto/virtual.contributor.settings.privacy.dto.update';
import { UpdatePlatformSettingsInput } from '@platform/platform-settings';
import { CreateSpaceAboutInput } from '@domain/space/space.about';
import { UpdateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.update';

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
      InviteNewContributorForRoleOnRoleSetInput,
      UpdateInnovationFlowInput,
      RoomSendMessageInput,
      CreateCalloutFramingInput,
      CreateCalloutContributionPolicyInput,
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
      DeleteDocumentInput,
      UpdateSpaceAboutInput,
      UpdatePostInput,
      UpdateDocumentInput,
      UpdateCalloutFramingInput,
      UpdateCalloutContributionDefaultsInput,
      UpdateCalloutContributionPolicyInput,
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
      VisualUploadImageInput,
      ForumCreateDiscussionInput,
      SendMessageOnCalloutInput,
      CreateCalloutOnCalloutsSetInput,
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
