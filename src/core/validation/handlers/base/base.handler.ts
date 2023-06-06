/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import { CreateActorGroupInput } from '@domain/context/actor-group';
import {
  ChallengeEventInput,
  UpdateChallengeInput,
} from '@domain/challenge/challenge';
import { UpdateHubInput } from '@domain/challenge/hub/dto/hub.dto.update';
import {
  CreateProjectInput,
  ProjectEventInput,
  UpdateProjectInput,
} from '@domain/collaboration/project/dto';
import { CreateRelationInput } from '@domain/collaboration/relation/relation.dto.create';
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
  CreateOpportunityInput,
  OpportunityEventInput,
  UpdateOpportunityInput,
} from '@domain/collaboration/opportunity/dto';
import {
  CreateUserGroupInput,
  UpdateUserGroupInput,
} from '@domain/community/user-group/dto';
import { CreateChallengeOnHubInput } from '@domain/challenge/challenge/dto/challenge.dto.create.in.hub';
import { CreateChallengeOnChallengeInput } from '@domain/challenge/challenge/dto/challenge.dto.create.in.challenge';
import { CreateActorInput, UpdateActorInput } from '@domain/context/actor';
import { CommunityApplyInput } from '@domain/community/community/dto/community.dto.apply';
import { CreateAspectOnCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create.aspect';
import { CreateCanvasOnCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create.canvas';
import { CommunicationCreateDiscussionInput } from '@domain/communication/communication/dto/communication.dto.create.discussion';
import { CreateFeedbackOnCommunityContextInput } from '@domain/community/community/dto/community.dto.create.feedback.on.context';
import { CreateReferenceOnProfileInput } from '@domain/common/profile/dto/profile.dto.create.reference';
import {
  CreateTagsetOnProfileInput,
  UpdateProfileInput,
} from '@domain/common/profile/dto';
import { ApplicationEventInput } from '@domain/community/application/dto/application.dto.event';
import { CanvasCheckoutEventInput } from '@domain/common/canvas-checkout/dto/canvas.checkout.dto.event';
import { OrganizationVerificationEventInput } from '@domain/community/organization-verification/dto/organization.verification.dto.event';
import { RoomSendMessageInput } from '@domain/communication/room2/dto/room.dto.send.message';
import { DiscussionSendMessageInput } from '@domain/communication/discussion/dto/discussion.dto.send.message';
import { UpdatesSendMessageInput } from '@domain/communication/updates/dto/updates.dto.send.message';
import { UpdateAspectInput } from '@domain/collaboration/aspect/dto/aspect.dto.update';
import { UpdateCanvasDirectInput } from '@domain/common/canvas/dto/canvas.dto.update.direct';
import { UpdateDiscussionInput } from '@domain/communication/discussion/dto/discussion.dto.update';
import { UpdateEcosystemModelInput } from '@domain/context/ecosystem-model/dto/ecosystem-model.dto.update';
import { SendMessageOnCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.message.created';
import { CreateCalloutOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.callout';
import { CreateCalendarEventOnCalendarInput } from '@domain/timeline/calendar/dto/calendar.dto.create.event';
import { UpdateCalendarEventInput } from '@domain/timeline/event';
import { UpdateCommunityApplicationFormInput } from '@domain/community/community/dto/community.dto.update.application.form';
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
import { CreateInvitationExistingUserOnCommunityInput } from '@domain/community/community/dto/community.dto.invite.existing.user';

export class BaseHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    const types: Function[] = [
      ApplicationEventInput,
      CanvasCheckoutEventInput,
      ChallengeEventInput,
      RoomSendMessageInput,
      DiscussionSendMessageInput,
      UpdatesSendMessageInput,
      OpportunityEventInput,
      OrganizationVerificationEventInput,
      ProjectEventInput,
      CreateActorGroupInput,
      CreateActorInput,
      CreateAspectOnCalloutInput,
      CreateDocumentInput,
      CreatePostTemplateOnTemplatesSetInput,
      CreateCanvasOnCalloutInput,
      CreateWhiteboardTemplateOnTemplatesSetInput,
      CreateChallengeOnHubInput,
      CreateChallengeOnChallengeInput,
      CreateOpportunityInput,
      CreateOrganizationInput,
      CreateUserGroupInput,
      CreateProjectInput,
      CreateRelationInput,
      CreateUserInput,
      CreateFeedbackOnCommunityContextInput,
      CreateReferenceOnProfileInput,
      CreateTagsetOnProfileInput,
      CreateCalendarEventOnCalendarInput,
      DeleteDocumentInput,
      UpdateActorInput,
      UpdateAspectInput,
      UpdateDocumentInput,
      UpdatePostTemplateInput,
      UpdateCommunityApplicationFormInput,
      UpdateHubInput,
      UpdateOrganizationInput,
      UpdateOpportunityInput,
      UpdateChallengeInput,
      UpdateCalendarEventInput,
      UpdateUserGroupInput,
      UpdateUserInput,
      UpdateProfileInput,
      UpdateProjectInput,
      UpdateCanvasDirectInput,
      UpdateWhiteboardTemplateInput,
      UpdateDiscussionInput,
      UpdateEcosystemModelInput,
      VisualUploadImageInput,
      CommunityApplyInput,
      CreateInvitationExistingUserOnCommunityInput,
      CommunicationCreateDiscussionInput,
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
