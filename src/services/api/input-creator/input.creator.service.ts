import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ICalloutContributionDefaults } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.interface';
import { CreateCalloutContributionDefaultsInput } from '@domain/collaboration/callout-contribution-defaults/dto/callout.contribution.defaults.dto.create';
import { ICalloutContributionPolicy } from '@domain/collaboration/callout-contribution-policy/callout.contribution.policy.interface';
import { CreateCalloutContributionPolicyInput } from '@domain/collaboration/callout-contribution-policy/dto/callout.contribution.policy.dto.create';
import { ICalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.interface';
import { CalloutFramingService } from '@domain/collaboration/callout-framing/callout.framing.service';
import { CreateCalloutFramingInput } from '@domain/collaboration/callout-framing/dto/callout.framing.dto.create';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { InnovationFlowStatesService } from '@domain/collaboration/innovation-flow-states/innovaton.flow.state.service';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.create';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { CreateLocationInput } from '@domain/common/location/dto/location.dto.create';
import { ILocation } from '@domain/common/location/location.interface';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { IProfile } from '@domain/common/profile/profile.interface';
import { CreateReferenceInput } from '@domain/common/reference/dto/reference.dto.create';
import { IReference } from '@domain/common/reference/reference.interface';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InputCreatorService {
  constructor(
    private calloutFramingService: CalloutFramingService,
    private innovationFlowStatesService: InnovationFlowStatesService
  ) {}

  public async buildCreateCalloutInputsFromCallouts(
    callouts: ICallout[]
  ): Promise<CreateCalloutInput[]> {
    return callouts.map(this.buildCreateCalloutInputFromCallout);
  }

  public buildCreateCalloutInputFromCallout(
    calloutInput: ICallout
  ): CreateCalloutInput {
    if (
      !calloutInput.framing ||
      !calloutInput.contributionDefaults ||
      !calloutInput.contributionPolicy
    ) {
      throw new EntityNotInitializedException(
        'Missing callout relation',
        LogContext.INPUT_CREATOR,
        {
          cause: 'Relation for Callout not loaded',
          calloutId: calloutInput.id,
        }
      );
    }

    const calloutGroupTagset = this.calloutFramingService.getCalloutGroupTagset(
      calloutInput.framing
    );
    return {
      nameID: calloutInput.nameID,
      type: calloutInput.type,
      visibility: calloutInput.visibility,
      groupName: calloutGroupTagset.tags[0],
      framing: this.buildCreateCalloutFramingInputFromCalloutFraming(
        calloutInput.framing
      ),
      contributionDefaults:
        this.buildCreateCalloutContributionDefaultsInputFromCalloutContributionDefaults(
          calloutInput.contributionDefaults
        ),
      contributionPolicy:
        this.buildCreateCalloutContributionPolicyInputFromCalloutContributionPolicy(
          calloutInput.contributionPolicy
        ),
      sortOrder: calloutInput.sortOrder,
    };
  }

  public async buildCreateCalloutInputsFromCollaboration(
    collaboration: ICollaboration
  ): Promise<CreateCalloutInput[]> {
    if (!collaboration.callouts) {
      throw new RelationshipNotFoundException(
        `Collaboration ${collaboration.id} is missing a relation`,
        LogContext.INPUT_CREATOR
      );
    }

    return collaboration.callouts.map(this.buildCreateCalloutInputFromCallout);
  }

  public buildCreateInnovationFlowInputFromInnovationFlow(
    innovationFlow: IInnovationFlow
  ): CreateInnovationFlowInput {
    if (!innovationFlow.states) {
      throw new EntityNotInitializedException(
        `Template ${innovationFlow.id} does not have innovation flow states`,
        LogContext.INPUT_CREATOR
      );
    }
    // Note: no profile currently present, so use the one from the template for now
    const result: CreateInnovationFlowInput = {
      profile: {
        displayName: innovationFlow.profile.displayName,
        description: innovationFlow.profile.description,
      },
      states: this.innovationFlowStatesService.getStates(innovationFlow.states),
    };
    return result;
  }

  public async buildCreateCommunityGuidelinesInputFromCommunityGuidelines(
    communityGuidelines: ICommunityGuidelines
  ): Promise<CreateCommunityGuidelinesInput> {
    const result: CreateCommunityGuidelinesInput = {
      profile: this.buildCreateProfileInputFromProfile(
        communityGuidelines.profile
      ),
    };
    return result;
  }

  private buildCreateCalloutFramingInputFromCalloutFraming(
    calloutFraming: ICalloutFraming
  ): CreateCalloutFramingInput {
    if (!calloutFraming.profile || !calloutFraming.whiteboard) {
      throw new EntityNotInitializedException(
        'CalloutFraming not fully initialised',
        LogContext.INPUT_CREATOR,
        {
          cause: 'Relation for callout framing not loaded',
          calloutFramingId: calloutFraming.id,
        }
      );
    }
    return {
      profile: this.buildCreateProfileInputFromProfile(calloutFraming.profile),
      whiteboard: this.buildCreateWhiteboardInputFromWhiteboard(
        calloutFraming.whiteboard
      ),
    };
  }

  private buildCreateCalloutContributionDefaultsInputFromCalloutContributionDefaults(
    calloutContributionDefaults?: ICalloutContributionDefaults
  ): CreateCalloutContributionDefaultsInput | undefined {
    if (!calloutContributionDefaults) {
      return undefined;
    }
    const result: CreateCalloutContributionDefaultsInput = {
      postDescription: calloutContributionDefaults.postDescription,
      whiteboardContent: calloutContributionDefaults.whiteboardContent,
    };
    return result;
  }

  private buildCreateCalloutContributionPolicyInputFromCalloutContributionPolicy(
    calloutContributionPolicy: ICalloutContributionPolicy
  ): CreateCalloutContributionPolicyInput {
    return {
      state: calloutContributionPolicy.state,
      allowedContributionTypes:
        calloutContributionPolicy.allowedContributionTypes,
    };
  }

  public buildCreateWhiteboardInputFromWhiteboard(
    whiteboard?: IWhiteboard
  ): CreateWhiteboardInput | undefined {
    if (!whiteboard) return undefined;
    return {
      profileData: this.buildCreateProfileInputFromProfile(whiteboard.profile),
      content: whiteboard.content,
      nameID: whiteboard.nameID,
    };
  }

  private buildCreateProfileInputFromProfile(
    profile: IProfile
  ): CreateProfileInput {
    return {
      description: profile.description,
      displayName: profile.displayName,
      location: this.buildCreateLocationInputFromLocation(profile.location),
      referencesData: this.buildCreateReferencesInputFromReferences(
        profile.references
      ),
      tagline: profile.tagline,
      tagsets: this.buildCreateTagsetsInputFromTagsets(profile.tagsets),
    };
  }

  private buildCreateLocationInputFromLocation(
    location?: ILocation
  ): CreateLocationInput | undefined {
    if (!location) return undefined;
    return {
      city: location.city,
      country: location.country,
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2,
      postalCode: location.postalCode,
      stateOrProvince: location.stateOrProvince,
    };
  }

  private buildCreateReferencesInputFromReferences(
    references?: IReference[]
  ): CreateReferenceInput[] {
    const result: CreateReferenceInput[] = [];
    if (!references) return result;
    for (const reference of references) {
      result.push(this.buildCreateReferenceInputFromReference(reference));
    }
    return result;
  }

  private buildCreateReferenceInputFromReference(
    reference: IReference
  ): CreateReferenceInput {
    return {
      name: reference.name,
      uri: reference.uri,
      description: reference.description,
    };
  }

  public buildCreateTagsetInputFromTagset(tagset: ITagset): CreateTagsetInput {
    return {
      name: tagset.name,
      tags: tagset.tags,
      type: tagset.type,
      tagsetTemplate: tagset.tagsetTemplate,
    };
  }

  public buildCreateTagsetsInputFromTagsets(
    tagsets?: ITagset[]
  ): CreateTagsetInput[] {
    const tagsetInputs: CreateTagsetInput[] = [];
    if (!tagsets) return tagsetInputs;
    for (const tagset of tagsets) {
      tagsetInputs.push(this.buildCreateTagsetInputFromTagset(tagset));
    }
    return tagsetInputs;
  }
}
