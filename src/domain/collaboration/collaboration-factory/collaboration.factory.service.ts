import { Injectable } from '@nestjs/common';
import { CollaborationService } from '../collaboration/collaboration.service';
import { CreateCalloutInput } from '../callout/dto/callout.dto.create';
import { ICollaboration } from '../collaboration/collaboration.interface';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { ICallout } from '../callout/callout.interface';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';
import { CreateCalloutFramingInput } from '../callout-framing/dto/callout.framing.dto.create';
import { ICalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.interface';
import { CreateCalloutContributionDefaultsInput } from '../callout-contribution-defaults/dto/callout.contribution.defaults.dto.create';
import { ICalloutContributionPolicy } from '../callout-contribution-policy/callout.contribution.policy.interface';
import { CreateCalloutContributionPolicyInput } from '../callout-contribution-policy/dto/callout.contribution.policy.dto.create';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { CreateInnovationFlowInput } from '../innovation-flow/dto';
import { InnovationFlowStatesService } from '../innovation-flow-states/innovaton.flow.state.service';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ILocation } from '@domain/common/location/location.interface';
import { CreateLocationInput } from '@domain/common/location/dto/location.dto.create';
import { IReference } from '@domain/common/reference/reference.interface';
import { CreateReferenceInput } from '@domain/common/reference/dto/reference.dto.create';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';

@Injectable()
export class CollaborationFactoryService {
  constructor(
    private collaborationService: CollaborationService,
    private calloutFramingService: CalloutFramingService,
    private innovationFlowStatesService: InnovationFlowStatesService
  ) {}

  public async buildCreateCalloutInputsFromCollaborationTemplate(
    collaborationTemplateID?: string
  ): Promise<CreateCalloutInput[]> {
    if (collaborationTemplateID) {
      const collaboration =
        await this.collaborationService.getCollaborationOrFail(
          collaborationTemplateID
        );
      return await this.buildCreateCalloutInputsFromCollaboration(
        collaboration
      );
    }
    return [];
  }

  public buildCreateInnovationFlowInputFromInnovationFlow(
    innovationFlow: IInnovationFlow
  ): CreateInnovationFlowInput {
    if (!innovationFlow.states) {
      throw new EntityNotInitializedException(
        `Template ${innovationFlow.id} does not have innovation flow states`,
        LogContext.TEMPLATES
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

  public async buildCreateCalloutInputsFromCollaboration(
    collaborationSource: ICollaboration
  ): Promise<CreateCalloutInput[]> {
    const sourceCallouts =
      await this.collaborationService.getCalloutsOnCollaboration(
        collaborationSource,
        {
          relations: {
            contributionDefaults: true,
            contributionPolicy: true,
            framing: {
              profile: {
                references: true,
                location: true,
                tagsets: true,
              },
              whiteboard: {
                profile: true,
              },
            },
          },
        }
      );

    return sourceCallouts.map(this.buildCreateCalloutInputFromCallout);
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
        LogContext.COLLABORATION,
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

  private buildCreateCalloutFramingInputFromCalloutFraming(
    calloutFraming: ICalloutFraming
  ): CreateCalloutFramingInput {
    if (!calloutFraming.profile || !calloutFraming.whiteboard) {
      throw new EntityNotInitializedException(
        'CalloutFraming not fully initialised',
        LogContext.COLLABORATION,
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
