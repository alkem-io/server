import { Injectable } from '@nestjs/common';
import { CalloutService } from '../callout/callout.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { CreateCalloutInput } from '../callout/dto/callout.dto.create';
import { ICollaboration } from '../collaboration/collaboration.interface';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { CalloutContributionDefaultsService } from '../callout-contribution-defaults/callout.contribution.defaults.service';
import { CalloutContributionPolicyService } from '../callout-contribution-policy/callout.contribution.policy.service';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { ICallout } from '../callout/callout.interface';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';

@Injectable()
export class CollaborationFactoryService {
  constructor(
    private calloutService: CalloutService,
    private collaborationService: CollaborationService,
    private calloutFramingService: CalloutFramingService,
    private contributionDefaultsService: CalloutContributionDefaultsService,
    private contributionPolicyService: CalloutContributionPolicyService,
    private contributionService: CalloutContributionService
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
      framing:
        this.calloutFramingService.createCalloutFramingInputFromCalloutFraming(
          calloutInput.framing
        ),
      contributionDefaults:
        this.contributionDefaultsService.createCalloutContributionDefaultsInputFromCalloutContributionDefaults(
          calloutInput.contributionDefaults
        ),
      contributionPolicy:
        this.contributionPolicyService.createCalloutContributionPolicyInputFromCalloutContributionPolicy(
          calloutInput.contributionPolicy
        ),
      sortOrder: calloutInput.sortOrder,
    };
  }
}
