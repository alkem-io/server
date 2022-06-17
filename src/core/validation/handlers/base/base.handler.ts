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
} from '@domain/collaboration/project';
import { CreateRelationInput } from '@domain/collaboration/relation';
import { CreateUserInput, UpdateUserInput } from '@domain/community/user';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { validate, ValidationError } from 'class-validator';
import { AbstractHandler } from './abstract.handler';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '@domain/community/organization';
import {
  CreateOpportunityInput,
  OpportunityEventInput,
  UpdateOpportunityInput,
} from '@domain/collaboration/opportunity';
import { CreateAspectOnContextInput } from '@domain/context/context/dto/context.dto.create.aspect';
import {
  CreateUserGroupInput,
  UpdateUserGroupInput,
} from '@domain/community/user-group/dto';
import { CreateChallengeOnHubInput } from '@domain/challenge/challenge/dto/challenge.dto.create.in.hub';
import { CreateChallengeOnChallengeInput } from '@domain/challenge/challenge/dto/challenge.dto.create.in.challenge';
import { CreateActorInput, UpdateActorInput } from '@domain/context/actor';
import { CommunityApplyInput } from '@domain/community/community/dto/community.dto.apply';
import { CreateCanvasOnContextInput } from '@domain/context/context/dto/context.dto.create.canvas';
import { CommunicationCreateDiscussionInput } from '@domain/communication/communication/dto/communication.dto.create.discussion';
import { CreateFeedbackOnCommunityContextInput } from '@domain/community/community/dto/community.dto.create.feedback.on.context';
import { CreateReferenceOnAspectInput } from '@domain/context/aspect/dto/aspect.dto.create.reference';
import { CreateReferenceOnContextInput } from '@domain/context/context/dto/context.dto.create.reference';
import { CreateReferenceOnProfileInput } from '@domain/community/profile/dto/profile.dto.create.reference';
import {
  CreateTagsetOnProfileInput,
  UpdateProfileInput,
} from '@domain/community/profile/dto';
import { ApplicationEventInput } from '@domain/community/application/dto/application.dto.event';
import { CanvasCheckoutEventInput } from '@domain/common/canvas-checkout/dto/canvas.checkout.dto.event';
import { OrganizationVerificationEventInput } from '@domain/community/organization-verification/dto/organization.verification.dto.event';
import { CommentsSendMessageInput } from '@domain/communication/comments/dto/comments.dto.send.message';
import { DiscussionSendMessageInput } from '@domain/communication/discussion/dto/discussion.dto.send.message';
import { UpdatesSendMessageInput } from '@domain/communication/updates/dto/updates.dto.send.message';
import { UpdateAspectInput } from '@domain/context/aspect';
import { UpdateCanvasDirectInput } from '@domain/common/canvas/dto/canvas.dto.update.direct';
import { UpdateDiscussionInput } from '@domain/communication/discussion/dto/discussion.dto.update';
import { UpdateEcosystemModelInput } from '@domain/context';
import { CreateAspectTemplateOnTemplatesSetInput } from '@domain/template/templates-set/dto/aspect.template.dto.create.on.templates.set';
import { CreateCanvasTemplateOnTemplatesSetInput } from '@domain/template/templates-set/dto/canvas.template.dto.create.on.templates.set';
import { UpdateAspectTemplateInput } from '@domain/template/aspect-template/dto/aspect.template.dto.update';
import { UpdateCanvasTemplateInput } from '@domain/template/canvas-template/dto/canvas.template.dto.update';

export class BaseHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    const types: Function[] = [
      ApplicationEventInput,
      CanvasCheckoutEventInput,
      ChallengeEventInput,
      CommentsSendMessageInput,
      DiscussionSendMessageInput,
      UpdatesSendMessageInput,
      OpportunityEventInput,
      OrganizationVerificationEventInput,
      ProjectEventInput,
      CreateActorGroupInput,
      CreateActorInput,
      CreateAspectOnContextInput,
      CreateAspectTemplateOnTemplatesSetInput,
      CreateCanvasOnContextInput,
      CreateCanvasTemplateOnTemplatesSetInput,
      CreateChallengeOnHubInput,
      CreateChallengeOnChallengeInput,
      CreateOpportunityInput,
      CreateOrganizationInput,
      CreateUserGroupInput,
      CreateProjectInput,
      CreateRelationInput,
      CreateUserInput,
      CreateFeedbackOnCommunityContextInput,
      CreateReferenceOnAspectInput,
      CreateReferenceOnContextInput,
      CreateReferenceOnProfileInput,
      CreateTagsetOnProfileInput,
      UpdateActorInput,
      UpdateAspectInput,
      UpdateAspectTemplateInput,
      UpdateHubInput,
      UpdateOrganizationInput,
      UpdateOpportunityInput,
      UpdateChallengeInput,
      UpdateUserGroupInput,
      UpdateUserInput,
      UpdateProfileInput,
      UpdateProjectInput,
      UpdateCanvasDirectInput,
      UpdateCanvasTemplateInput,
      UpdateDiscussionInput,
      UpdateEcosystemModelInput,
      CommunityApplyInput,
      CommunicationCreateDiscussionInput,
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
