/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import { CreateActorGroupInput } from '@domain/context/actor-group';
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
import { CreateActorInput, UpdateActorInput } from '@domain/context/actor';
import { CreateReferenceOnProfileInput } from '@domain/common/profile/dto/profile.dto.create.reference';
import {
  CreateTagsetOnProfileInput,
  UpdateProfileInput,
} from '@domain/common/profile/dto';
import { ApplicationEventInput } from '@domain/community/application/dto/application.dto.event';
import { OrganizationVerificationEventInput } from '@domain/community/organization-verification/dto/organization.verification.dto.event';
import { RoomSendMessageInput } from '@domain/communication/room/dto/room.dto.send.message';
import { UpdatePostInput } from '@domain/collaboration/post/dto/post.dto.update';
import { UpdateWhiteboardDirectInput } from '@domain/common/whiteboard/types';
import { UpdateDiscussionInput } from '@platform/forum-discussion/dto/discussion.dto.update';
import { UpdateEcosystemModelInput } from '@domain/context/ecosystem-model/dto/ecosystem-model.dto.update';
import { SendMessageOnCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.message.created';
import { CreateCalloutOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.callout';
import { CreateCalendarEventOnCalendarInput } from '@domain/timeline/calendar/dto/calendar.dto.create.event';
import { UpdateCalendarEventInput } from '@domain/timeline/event';
import { UpdateCommunityApplicationFormInput } from '@domain/community/community/dto/community.dto.update.application.form';
import { CreateCalloutTemplateOnTemplatesSetInput } from '@domain/template/templates-set/dto/callout.template.dto.create.on.templates.set';
import { CreatePostTemplateOnTemplatesSetInput } from '@domain/template/templates-set/dto/post.template.dto.create.on.templates.set';
import { CreateWhiteboardTemplateOnTemplatesSetInput } from '@domain/template/templates-set/dto/whiteboard.template.dto.create.on.templates.set';
import { UpdatePostTemplateInput } from '@domain/template/post-template/dto/post.template.dto.update';
import { UpdateWhiteboardTemplateInput } from '@domain/template/whiteboard-template/dto/whiteboard.template.dto.update';
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
import { UpdateCalloutTemplateInput } from '@domain/template/callout-template/dto/callout.template.dto.update';
import { CreateCalloutTemplateInput } from '@domain/template/callout-template/dto/callout.template.dto.create';
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
import {
  CreateAccountInput,
  UpdateAccountPlatformSettingsInput,
} from '@domain/space/account/dto';
import { UpdateAccountDefaultsInput } from '@domain/space/account/dto/account.dto.update.defaults';
import { UpdateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.update';
import { ForumCreateDiscussionInput } from '@platform/forum/dto/forum.dto.create.discussion';
import { CommunityRoleApplyInput } from '@domain/community/community-role/dto/community.role.dto.apply';
import { CreateInvitationForContributorsOnCommunityInput } from '@domain/community/community-role/dto/community.role.dto.invite.contributor';
import { CreatePlatformInvitationOnCommunityInput } from '@domain/community/community-role/dto/community.role.dto.platform.invitation.community';

export class BaseHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    const types: Function[] = [
      ApplicationEventInput,
      UpdateInnovationFlowInput,
      RoomSendMessageInput,
      OrganizationVerificationEventInput,
      CreateCalloutFramingInput,
      CreateCalloutContributionPolicyInput,
      CreateCalloutContributionDefaultsInput,
      CreateActorGroupInput,
      CreateActorInput,
      CreateContributionOnCalloutInput,
      CreateCollaborationInput,
      CreateDocumentInput,
      CreateCalloutTemplateInput,
      CreateCalloutTemplateOnTemplatesSetInput,
      CreatePostTemplateOnTemplatesSetInput,
      CreateWhiteboardTemplateOnTemplatesSetInput,
      CreateSubspaceInput,
      CreateLinkInput,
      CreateOrganizationInput,
      CreateUserGroupInput,
      CreateUserInput,
      CreateReferenceOnProfileInput,
      CreateTagsetOnProfileInput,
      CreateCalendarEventOnCalendarInput,
      CreateAccountInput,
      DeleteDocumentInput,
      UpdateActorInput,
      UpdateAccountPlatformSettingsInput,
      UpdateAccountDefaultsInput,
      UpdatePostInput,
      UpdateDocumentInput,
      UpdateCalloutFramingInput,
      UpdateCalloutContributionDefaultsInput,
      UpdateCalloutContributionPolicyInput,
      UpdateCalloutTemplateInput,
      UpdatePostTemplateInput,
      UpdateCommunityApplicationFormInput,
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
      UpdateWhiteboardDirectInput,
      UpdateWhiteboardTemplateInput,
      UpdateDiscussionInput,
      UpdateEcosystemModelInput,
      UpdateSpaceSettingsEntityInput,
      UpdateSpaceSettingsInput,
      VisualUploadImageInput,
      CommunityRoleApplyInput,
      CreateInvitationForContributorsOnCommunityInput,
      CreatePlatformInvitationOnCommunityInput,
      ForumCreateDiscussionInput,
      SendMessageOnCalloutInput,
      CreateCalloutOnCollaborationInput,
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
