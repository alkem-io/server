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
import { ProfileService } from '@domain/common/profile/profile.service';
import { ICalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.interface';
import { CreateCalloutContributionDefaultsInput } from '../callout-contribution-defaults/dto/callout.contribution.defaults.dto.create';
import { ICalloutContributionPolicy } from '../callout-contribution-policy/callout.contribution.policy.interface';
import { CreateCalloutContributionPolicyInput } from '../callout-contribution-policy/dto/callout.contribution.policy.dto.create';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';

@Injectable()
export class CollaborationFactoryService {
  constructor(
    private collaborationService: CollaborationService,
    private calloutFramingService: CalloutFramingService,
    private profileService: ProfileService
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
      framing: this.createCalloutFramingInputFromCalloutFraming(
        calloutInput.framing
      ),
      contributionDefaults:
        this.createCalloutContributionDefaultsInputFromCalloutContributionDefaults(
          calloutInput.contributionDefaults
        ),
      contributionPolicy:
        this.createCalloutContributionPolicyInputFromCalloutContributionPolicy(
          calloutInput.contributionPolicy
        ),
      sortOrder: calloutInput.sortOrder,
    };
  }

  private createCalloutFramingInputFromCalloutFraming(
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
      profile: this.profileService.createProfileInputFromProfile(
        calloutFraming.profile
      ),
      whiteboard: this.createWhiteboardInputFromWhiteboard(
        calloutFraming.whiteboard
      ),
    };
  }

  private createCalloutContributionDefaultsInputFromCalloutContributionDefaults(
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

  private createCalloutContributionPolicyInputFromCalloutContributionPolicy(
    calloutContributionPolicy: ICalloutContributionPolicy
  ): CreateCalloutContributionPolicyInput {
    return {
      state: calloutContributionPolicy.state,
      allowedContributionTypes:
        calloutContributionPolicy.allowedContributionTypes,
    };
  }

  public createWhiteboardInputFromWhiteboard(
    whiteboard?: IWhiteboard
  ): CreateWhiteboardInput | undefined {
    if (!whiteboard) return undefined;
    return {
      profileData: this.profileService.createProfileInputFromProfile(
        whiteboard.profile
      ),
      content: whiteboard.content,
      nameID: whiteboard.nameID,
    };
  }
}
