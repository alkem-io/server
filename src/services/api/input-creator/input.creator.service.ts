import { LogContext } from '@common/enums/logging.context';
import { validateAndConvertVisualTypeName } from '@common/enums/visual.type';
import { RelationshipNotFoundException } from '@common/exceptions';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { ICalloutContributionDefaults } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.interface';
import { CreateCalloutContributionDefaultsInput } from '@domain/collaboration/callout-contribution-defaults/dto/callout.contribution.defaults.dto.create';
import { ICalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.interface';
import { CreateCalloutFramingInput } from '@domain/collaboration/callout-framing/dto/callout.framing.dto.create';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { CreateCalloutsSetInput } from '@domain/collaboration/callouts-set/dto/callouts.set.dto.create';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.create';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { CreateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-state/dto';
import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-state/innovation.flow.state.interface';
import { IClassification } from '@domain/common/classification/classification.interface';
import { CreateClassificationInput } from '@domain/common/classification/dto/classification.dto.create';
import { CreateLocationInput } from '@domain/common/location/dto/location.dto.create';
import { ILocation } from '@domain/common/location/location.interface';
import { yjsStateToMarkdown } from '@domain/common/memo/conversion';
import { CreateMemoInput } from '@domain/common/memo/dto/memo.dto.create';
import { IMemo } from '@domain/common/memo/memo.interface';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { CreateVisualOnProfileInput } from '@domain/common/profile/dto/profile.dto.create.visual';
import { IProfile } from '@domain/common/profile/profile.interface';
import { CreateReferenceInput } from '@domain/common/reference/dto/reference.dto.create';
import { IReference } from '@domain/common/reference/reference.interface';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { CreateSpaceAboutInput, ISpaceAbout } from '@domain/space/space.about';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { CreateTemplateContentSpaceInput } from '@domain/template/template-content-space/dto/template.content.space.dto.create';
import { TemplateContentSpace } from '@domain/template/template-content-space/template.content.space.entity';
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { templateContentSpaces } from '@domain/template/template-content-space/template.content.space.schema';

@Injectable()
export class InputCreatorService {
  constructor(
    private collaborationService: CollaborationService,
    private spaceLookupService: SpaceLookupService,
    private calloutService: CalloutService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  public async buildCreateCalloutInputsFromCallouts(
    callouts: ICallout[]
  ): Promise<CreateCalloutInput[]> {
    const result: CreateCalloutInput[] = [];
    for (const callout of callouts) {
      result.push(await this.buildCreateCalloutInputFromCallout(callout.id));
    }
    return result;
  }

  public async buildCreateCalloutInputFromCallout(
    calloutID: string
  ): Promise<CreateCalloutInput> {
    const callout = await this.calloutService.getCalloutOrFail(calloutID, {
      relations: {
        contributionDefaults: true,
        classification: true,
        framing: true,
      } as any,
    });
    if (
      !callout.framing ||
      !callout.framing.profile ||
      !callout.framing.profile.tagsets ||
      !callout.contributionDefaults ||
      !callout.settings ||
      !callout.classification
    ) {
      throw new EntityNotInitializedException(
        `Missing relation on callout: ${calloutID}`,
        LogContext.INPUT_CREATOR,
        {
          cause: 'Relation for Callout not loaded',
          calloutId: calloutID,
        }
      );
    }

    return {
      nameID: callout.nameID,
      classification: this.buildCreateClassificationInputFromClassification(
        callout.classification
      ),
      framing: this.buildCreateCalloutFramingInputFromCalloutFraming(
        callout.framing
      ),
      settings: callout.settings,
      contributionDefaults:
        this.buildCreateCalloutContributionDefaultsInputFromCalloutContributionDefaults(
          callout.contributionDefaults
        ),
      sortOrder: callout.sortOrder,
    };
  }

  public async buildCreateCalloutsSetInputFromCalloutsSet(
    calloutsSet: ICalloutsSet
  ): Promise<CreateCalloutsSetInput> {
    if (!calloutsSet.callouts) {
      throw new RelationshipNotFoundException(
        `CalloutsSet ${calloutsSet.id} is missing a relation`,
        LogContext.INPUT_CREATOR
      );
    }

    const calloutInputs: CreateCalloutInput[] = [];
    for (const callout of calloutsSet.callouts) {
      calloutInputs.push(
        await this.buildCreateCalloutInputFromCallout(callout.id)
      );
    }

    const result: CreateCalloutsSetInput = {
      calloutsData: calloutInputs,
    };

    return result;
  }

  public async buildCreateTemplateContentSpaceInputFromSpace(
    spaceID: string,
    recursive: boolean = true
  ): Promise<CreateTemplateContentSpaceInput> {
    const space = await this.spaceLookupService.getSpaceOrFail(spaceID, {
      relations: {
        collaboration: true,
        subspaces: true,
        about: true,
      },
    } as any);
    if (!space.collaboration || !space.about || !space.subspaces) {
      throw new RelationshipNotFoundException(
        `Space ${space.id} is missing a relation`,
        LogContext.INPUT_CREATOR
      );
    }

    const collaborationInput =
      await this.buildCreateCollaborationInputFromCollaboration(
        space.collaboration.id
      );
    const aboutInput = this.buildCreateSpaceAboutInputFromSpaceAbout(
      space.about
    );
    const subspacesInput: CreateTemplateContentSpaceInput[] = [];
    if (recursive) {
      for (const subspace of space.subspaces) {
        const subspaceInput =
          await this.buildCreateTemplateContentSpaceInputFromSpace(
            subspace.id,
            recursive
          );
        subspacesInput.push(subspaceInput);
      }
    }

    const result: CreateTemplateContentSpaceInput = {
      collaborationData: collaborationInput,
      about: aboutInput,
      level: space.level,
      settings: space.settings,
      subspaces: subspacesInput,
    };

    return result;
  }

  public async buildCreateTemplateContentSpaceInputFromContentSpace(
    contentSpaceID: string
  ): Promise<CreateTemplateContentSpaceInput> {
    const contentSpace = await this.db.query.templateContentSpaces.findFirst({
      where: eq(templateContentSpaces.id, contentSpaceID),
      with: {
        subspaces: true,
        collaboration: true,
        about: {
          with: {
            profile: {
              with: {
                references: true,
                visuals: true,
                location: true,
                tagsets: true,
              },
            },
            guidelines: {
              with: {
                profile: {
                  with: {
                    references: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contentSpace) {
      throw new RelationshipNotFoundException(
        `ContentSpace ${contentSpaceID} not found`,
        LogContext.INPUT_CREATOR
      );
    }

    if (
      !contentSpace.collaboration ||
      !contentSpace.about ||
      !contentSpace.subspaces
    ) {
      throw new RelationshipNotFoundException(
        `ContentSpace ${contentSpace.id} is missing a relation`,
        LogContext.INPUT_CREATOR
      );
    }

    const collaborationInput =
      await this.buildCreateCollaborationInputFromCollaboration(
        contentSpace.collaboration.id
      );
    const aboutInput = this.buildCreateSpaceAboutInputFromSpaceAbout(
      contentSpace.about as unknown as ISpaceAbout
    );

    const subspacesInput: CreateTemplateContentSpaceInput[] = [];
    for (const subspace of contentSpace.subspaces) {
      const subspaceInput =
        await this.buildCreateTemplateContentSpaceInputFromContentSpace(
          subspace.id
        );
      subspacesInput.push(subspaceInput);
    }

    const result: CreateTemplateContentSpaceInput = {
      collaborationData: collaborationInput,
      about: aboutInput,
      level: contentSpace.level,
      settings: contentSpace.settings as any,
      subspaces: subspacesInput,
    };

    return result;
  }

  public async buildCreateCollaborationInputFromCollaboration(
    collaborationID: string
  ): Promise<CreateCollaborationInput> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(collaborationID, {
        with: {
          calloutsSet: true,
          innovationFlow: true,
        },
      } as any);
    if (
      !collaboration.calloutsSet ||
      !collaboration.calloutsSet.callouts ||
      !collaboration.innovationFlow ||
      !collaboration.innovationFlow.states
    ) {
      throw new RelationshipNotFoundException(
        `Collaboration ${collaboration.id} is missing a relation`,
        LogContext.INPUT_CREATOR
      );
    }

    const calloutsSetInput =
      await this.buildCreateCalloutsSetInputFromCalloutsSet(
        collaboration.calloutsSet
      );

    const result: CreateCollaborationInput = {
      calloutsSetData: calloutsSetInput,
      innovationFlowData: this.buildCreateInnovationFlowInputFromInnovationFlow(
        collaboration.innovationFlow
      ),
    };

    return result;
  }

  public buildCreateInnovationFlowInputFromInnovationFlow(
    innovationFlow: IInnovationFlow
  ): CreateInnovationFlowInput {
    if (
      !innovationFlow.states ||
      !innovationFlow.settings ||
      !innovationFlow.profile
    ) {
      throw new EntityNotInitializedException(
        `Template ${innovationFlow.id} is missing relation`,
        LogContext.INPUT_CREATOR
      );
    }

    const currentState = innovationFlow.states.find(
      state => state.id === innovationFlow.currentStateID
    );
    // Note: no profile currently present, so use the one from the template for now
    const result: CreateInnovationFlowInput = {
      settings: innovationFlow.settings,
      profile: {
        displayName: innovationFlow.profile.displayName,
        description: innovationFlow.profile.description,
      },
      states: this.buildCreateInnovationFlowStateInputFromInnovationFlowState(
        innovationFlow.states
      ),
      currentStateDisplayName: currentState?.displayName ?? '',
    };
    return result;
  }

  public buildCreateInnovationFlowStateInputFromInnovationFlowState(
    states: IInnovationFlowState[]
  ): CreateInnovationFlowStateInput[] {
    const result: CreateInnovationFlowStateInput[] = [];
    for (const state of states) {
      result.push({
        displayName: state.displayName,
        description: state.description,
        settings: state.settings,
        sortOrder: state.sortOrder,
      });
    }
    return result;
  }

  public buildCreateCommunityGuidelinesInputFromCommunityGuidelines(
    communityGuidelines: ICommunityGuidelines
  ): CreateCommunityGuidelinesInput {
    const result: CreateCommunityGuidelinesInput = {
      profile: this.buildCreateProfileInputFromProfile(
        communityGuidelines.profile
      ),
    };
    return result;
  }

  public buildCreateWhiteboardInputFromWhiteboard(
    whiteboard?: IWhiteboard
  ): CreateWhiteboardInput | undefined {
    if (!whiteboard) return undefined;
    return {
      profile: this.buildCreateProfileInputFromProfile(whiteboard.profile),
      content: whiteboard.content,
      nameID: whiteboard.nameID,
      previewSettings: whiteboard.previewSettings,
    };
  }

  public buildCreateMemoInputFromMemo(memo: IMemo): CreateMemoInput {
    if (!memo.profile) {
      throw new EntityNotInitializedException(
        'Memo not fully initialised',
        LogContext.INPUT_CREATOR,
        {
          cause: 'Relation "profile" for memo not loaded',
          memoId: memo.id,
        }
      );
    }
    return {
      nameID: memo.nameID,
      markdown: memo.content ? yjsStateToMarkdown(memo.content) : undefined,
      profile: this.buildCreateProfileInputFromProfile(memo.profile),
    };
  }

  public buildCreateSpaceAboutInputFromSpaceAbout(
    spaceAbout: ISpaceAbout
  ): CreateSpaceAboutInput {
    const result: CreateSpaceAboutInput = {
      profileData: this.buildCreateProfileInputFromProfile(spaceAbout.profile),
      who: spaceAbout.who,
      why: spaceAbout.why,
      guidelines: spaceAbout.guidelines
        ? this.buildCreateCommunityGuidelinesInputFromCommunityGuidelines(
            spaceAbout.guidelines
          )
        : undefined,
    };

    return result;
  }

  private buildCreateCalloutFramingInputFromCalloutFraming(
    calloutFraming: ICalloutFraming
  ): CreateCalloutFramingInput {
    if (!calloutFraming.profile) {
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
      type: calloutFraming.type,
      profile: this.buildCreateProfileInputFromProfile(calloutFraming.profile),
      whiteboard: this.buildCreateWhiteboardInputFromWhiteboard(
        calloutFraming.whiteboard
      ),
      link: calloutFraming.link?.profile
        ? {
            profile: this.buildCreateProfileInputFromProfile(
              calloutFraming.link.profile
            ),
            uri: calloutFraming.link.uri,
          }
        : undefined,
      memo: calloutFraming.memo
        ? this.buildCreateMemoInputFromMemo(calloutFraming.memo)
        : undefined,
      mediaGallery: calloutFraming.mediaGallery?.visuals
        ? {
            visuals: calloutFraming.mediaGallery.visuals.map(visual => ({
              name: validateAndConvertVisualTypeName(visual.name),
              uri: visual.uri,
            })),
          }
        : undefined,
    };
  }

  private buildCreateCalloutContributionDefaultsInputFromCalloutContributionDefaults(
    calloutContributionDefaults?: ICalloutContributionDefaults
  ): CreateCalloutContributionDefaultsInput | undefined {
    if (!calloutContributionDefaults) {
      return undefined;
    }
    const result: CreateCalloutContributionDefaultsInput = {
      defaultDisplayName: calloutContributionDefaults.defaultDisplayName,
      postDescription: calloutContributionDefaults.postDescription,
      whiteboardContent: calloutContributionDefaults.whiteboardContent,
    };
    return result;
  }

  private buildCreateClassificationInputFromClassification(
    classification: IClassification
  ): CreateClassificationInput {
    return {
      tagsets: this.buildCreateTagsetsInputFromTagsets(classification.tagsets),
    };
  }

  public buildCreateProfileInputFromProfile(
    profile: IProfile
  ): CreateProfileInput {
    if (!profile) {
      throw new EntityNotInitializedException(
        'Profile not fully initialized',
        LogContext.INPUT_CREATOR,
        {
          cause: 'Profile relation not loaded',
        }
      );
    }
    return {
      description: profile.description,
      displayName: profile.displayName,
      location: this.buildCreateLocationInputFromLocation(profile.location),
      referencesData: this.buildCreateReferencesInputFromReferences(
        profile.references
      ),
      tagline: profile.tagline,
      tagsets: this.buildCreateTagsetsInputFromTagsets(profile.tagsets),
      visuals: this.buildCreateVisualsOnProfileInputFromVisuals(
        profile.visuals
      ),
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

  private buildCreateVisualsOnProfileInputFromVisuals(
    visuals?: IVisual[]
  ): CreateVisualOnProfileInput[] {
    const result: CreateVisualOnProfileInput[] = [];
    if (!visuals) return result;
    for (const visual of visuals) {
      result.push({
        name: validateAndConvertVisualTypeName(visual.name),
        uri: visual.uri,
      });
    }
    return result;
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
